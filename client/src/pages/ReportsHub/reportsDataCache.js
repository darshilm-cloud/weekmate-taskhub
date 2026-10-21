import Service from "../../service";

/**
 * Shared, module-level data layer for the Reports area (/reports and /reports/:reportKey).
 *
 * Why module-level: the landing page (/reports) and every report page are separate routes, so
 * component state does not survive navigation. Anything fetched here is:
 *  - shared  - the landing page, the report page and the dropdowns all read the same entry,
 *  - deduped - a request that is still in flight is reused (a prefetch started on the landing
 *              page is simply awaited by the report page instead of being fetched again),
 *  - short-lived - entries expire (TTL) so data never goes meaningfully stale,
 *  - scoped  - keys include the signed-in user + company, so one account never sees another's
 *              (admin vs non-admin results differ server-side).
 * Failed requests are never cached.
 */

const DEFAULT_TTL_MS = 60 * 1000;
const store = new Map(); // key -> { promise, at, ttl }

const getScope = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user_data") || "null");
    const id = user?._id || user?.id || user?.user?._id;
    if (id) return `${id}:${localStorage.getItem("companyDomain") || ""}`;
  } catch (error) {
    // fall through to the token-based scope
  }
  return String(localStorage.getItem("accessToken") || "anon").slice(-24);
};

const cachedRequest = (key, fetcher, ttl = DEFAULT_TTL_MS) => {
  const fullKey = `${getScope()}|${key}`;
  const hit = store.get(fullKey);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.promise;

  const promise = Promise.resolve()
    .then(fetcher)
    .catch((error) => {
      if (store.get(fullKey)?.promise === promise) store.delete(fullKey);
      throw error;
    });
  store.set(fullKey, { promise, at: Date.now(), ttl });
  return promise;
};

export const clearReportsCache = () => store.clear();

// ── Shared filter data (used by every report's dropdowns) ───────────────────

export const getReportEmployees = () =>
  cachedRequest("employees", () =>
    Service.makeAPICall({
      methodName: Service.getMethod,
      api_url: "/master/get/employees",
      params: "limit=200",
    })
  );

// ONE "all projects" request. The un-searched list is shared/cached; a search term bypasses
// the cache (it is a different result set).
export const getMasterProjects = ({ search = "" } = {}) => {
  const term = String(search || "").trim();
  const request = () =>
    Service.makeAPICall({
      methodName: Service.getMethod,
      api_url: Service.getProjectList,
      params: `page=1&limit=10000&includeClosed=true${term ? `&search=${encodeURIComponent(term)}` : ""}`,
    });
  return term ? request() : cachedRequest("master-projects", request);
};

// ── Project Wise Report ─────────────────────────────────────────────────────

/**
 * Everything the project report needs that does not depend on table page / sort:
 *  - the project report list,
 *  - the master project list,
 *  - per-project task totals from ONE grouped query (project_task_counts),
 *  - (only with a top project filter) the same totals for the selected projects.
 * `startIso` / `endIso` are the report date range (ISO strings or null).
 */
export const getProjectReportBundle = ({
  search = "",
  startIso = null,
  endIso = null,
  selectedProjectIds = [],
} = {}) => {
  const term = String(search || "").trim();
  const hasProjectFilter = selectedProjectIds.length > 0;
  const key = `project-report:${JSON.stringify([term, startIso, endIso, selectedProjectIds])}`;

  return cachedRequest(key, async () => {
    const countsBody = {
      view_all: true,
      status: "all",
      project_task_counts: true,
      start_date: startIso || undefined,
      end_date: endIso || undefined,
    };

    const [projectsResponse, projectListResponse, taskCountsAllResponse, taskCountsFilteredResponse] =
      await Promise.all([
        Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getProjectRunningReportsDetails,
          body: {
            technologies: [],
            types: [],
            managers: [],
            search: term,
            pageNo: 1,
            limit: 10000,
            sort: "title",
            sortBy: "asc",
            isExport: false,
          },
        }),
        getMasterProjects({ search: term }),
        Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.taskList,
          body: countsBody,
        }),
        hasProjectFilter
          ? Service.makeAPICall({
              methodName: Service.postMethod,
              api_url: Service.taskList,
              body: { ...countsBody, project_id: selectedProjectIds },
            })
          : Promise.resolve(null),
      ]);

    return { projectsResponse, projectListResponse, taskCountsAllResponse, taskCountsFilteredResponse };
  });
};

// ── Prefetch (used by the /reports landing page) ────────────────────────────

// Shared filter data every report needs: cheap, so it is fetched as soon as the landing page
// opens. Errors are swallowed - a prefetch must never surface as a failure.
export const prefetchSharedReportData = () => {
  getReportEmployees().catch(() => {});
  getMasterProjects().catch(() => {});
};

// Heavy, report-specific data: only warmed when the user shows intent to open that report
// (hover / focus / touch on its card), not for every visitor of the landing page. The report
// page then awaits the very same in-flight/cached promise, so nothing is fetched twice.
export const prefetchReport = (reportKey) => {
  if (reportKey === "project-report") {
    // default (unfiltered) view - must mirror what the page requests on first load
    getProjectReportBundle({}).catch(() => {});
  }
};
