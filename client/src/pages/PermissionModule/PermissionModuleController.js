import { useState, useEffect, useCallback, useRef } from "react";
import { message } from "antd";
import Service from "../../service";
import { useLocation } from "react-router-dom";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions/Auth";
import { useDispatch } from "react-redux";

const PermissionModuleController = () => {
  const dispatch  = useDispatch();
  const location  = useLocation();
  const params    = new URLSearchParams(location.search);
  const urlRoleId = params.get("role_id");

  /* ── server state ── */
  const [roleListData,       setRoleListData]       = useState([]);
  const [permissionListData, setPermissionListData] = useState([]);

  /* ── local ui state ── */
  const [localPermissions, setLocalPermissions] = useState([]);
  const [selectedRoleId,   setSelectedRoleId]   = useState(urlRoleId || null);
  const [isDirty,          setIsDirty]          = useState(false);
  const [permLoading,      setPermLoading]      = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [pageLoading,      setPageLoading]      = useState(true);

  /* legacy modal state kept so old import still compiles */
  const [PermissionModalOpen, setPermissionModalOpen] = useState(false);

  /* ref for original snapshot (used by discard) */
  const originalRef = useRef([]);

  /* ref always holds LATEST localPermissions — updated synchronously
     inside every write so savePermissions never reads stale data */
  const localPermissionsRef = useRef([]);

  /* helper: write to both state AND ref atomically */
  const setPermissions = useCallback((next) => {
    localPermissionsRef.current = next;
    setLocalPermissions(next);
  }, []);

  /* ── 1. fetch all roles ─────────────────────────────────────── */
  const getRoledetails = useCallback(async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url:    Service.getAllRole,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        const roles = response.data.data;
        setRoleListData(roles);
        /* auto-select first role when no URL param */
        if (!selectedRoleId && roles.length > 0) {
          const first = roles[0];
          setSelectedRoleId(first._id);
          fetchPermissionsForRoleInner(first._id);
        }
      }
      setPageLoading(false);
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
      message.error("Failed to load roles");
      setPageLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  /* ── inner helper (avoids circular dep) ──────────────────────── */
  const fetchPermissionsForRoleInner = async (roleId) => {
    if (!roleId) return;
    setPermLoading(true);
    setIsDirty(false);
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url:    `${Service.getPermissionByRole}/${roleId}`,
      });
      const data = response?.data?.data || [];
      const mapped = data.map((p) => ({ ...p }));
      setPermissionListData(data);
      originalRef.current = mapped;
      setPermissions(mapped);          // updates ref + state together
    } catch (error) {
      message.error("Failed to load permissions");
    } finally {
      setPermLoading(false);
    }
  };

  /* ── 2. public fetch permissions ─────────────────────────────── */
  const fetchPermissionsForRole = useCallback(
    (roleId) => fetchPermissionsForRoleInner(roleId),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* legacy alias */
  const getPermissionByRole = useCallback(
    (roleId) => fetchPermissionsForRoleInner(roleId),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ── 3. select a role (sidebar click) ──────────────────────── */
  const selectRole = useCallback(
    (roleId) => {
      if (isDirty) {
        if (!window.confirm("You have unsaved changes. Discard and switch role?")) return;
      }
      setSelectedRoleId(roleId);
      fetchPermissionsForRoleInner(roleId);
    },
    [isDirty]  // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ── 4. local toggle (no API call, just track changes) ─────── */
  const onPermissionChange = useCallback((checked, permId, permName) => {
    /* read from ref — always the latest value, no stale closure risk */
    const prev = localPermissionsRef.current;
    let next;

    if (permId) {
      /* existing resource — update by _id */
      next = prev.map((p) =>
        p._id === permId ? { ...p, isAccess: checked } : p
      );
    } else {
      /* resource without DB record — virtual entry tracked by name */
      const exists = prev.some((p) => p.name === permName);
      next = exists
        ? prev.map((p) => p.name === permName ? { ...p, isAccess: checked } : p)
        : [...prev, { name: permName, isAccess: checked, _id: null }];
    }

    const dirty = next.some((p) => {
      const orig = originalRef.current.find((o) =>
        p._id ? o._id === p._id : o.name === p.name
      );
      return orig ? orig.isAccess !== p.isAccess : p.isAccess;
    });

    setPermissions(next);    // updates ref + state atomically
    setIsDirty(dirty);
  }, [setPermissions]);

  /* ── 5. save all pending changes ───────────────────────────── */
  const savePermissions = useCallback(async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      dispatch(showAuthLoader());
      /* read from ref — guaranteed to be latest regardless of render cycle */
      const latest = localPermissionsRef.current;
      const reqBody = {
        resource_ids:     latest.filter((p) => p.isAccess && p._id).map((p) => p._id),
        permission_names: latest.filter((p) => p.isAccess && !p._id).map((p) => p.name),
        pms_role_id:      selectedRoleId,
      };
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url:    Service.addPermissionByRole,
        body:       reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.status === 1) {
        message.success("Permissions saved successfully");
        await fetchPermissionsForRoleInner(selectedRoleId);
        setIsDirty(false);
      } else {
        message.error(response?.data?.message || "Save failed");
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      message.error("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  }, [selectedRoleId, dispatch]);

  /* ── 6. discard local changes ───────────────────────────────── */
  const discardChanges = useCallback(() => {
    setPermissions(originalRef.current.map((p) => ({ ...p })));
    setIsDirty(false);
  }, [setPermissions]);

  /* ── 7. create a new role ───────────────────────────────────── */
  const createRole = useCallback(
    async ({ role_name, description, cloneFrom }) => {
      try {
        dispatch(showAuthLoader());
        const reqBody = { role_name, description };
        if (cloneFrom) reqBody.clone_from = cloneFrom;

        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url:    "/roles/add",
          body:       reqBody,
        });
        dispatch(hideAuthLoader());
        if (
          response?.data?.status === 1 ||
          response?.data?.statusCode === 201 ||
          response?.status === 201
        ) {
          message.success("Role created successfully");
          await getRoledetails();
          return true;
        } else {
          message.error(response?.data?.message || "Failed to create role");
          return false;
        }
      } catch (error) {
        dispatch(hideAuthLoader());
        message.error("Failed to create role");
        return false;
      }
    },
    [dispatch, getRoledetails]
  );

  /* ── init ─────────────────────────────────────────────────────── */
  useEffect(() => {
    getRoledetails();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (urlRoleId && urlRoleId !== selectedRoleId) {
      setSelectedRoleId(urlRoleId);
      fetchPermissionsForRoleInner(urlRoleId);
    }
  }, [urlRoleId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    /* data */
    roleListData,
    permissionListData,
    localPermissions,
    selectedRoleId,
    isDirty,
    permLoading,
    saving,
    pageLoading,
    /* actions */
    selectRole,
    getPermissionByRole,
    fetchPermissionsForRole,
    onPermissionChange,
    savePermissions,
    discardChanges,
    createRole,
    /* legacy */
    PermissionModalOpen,
    setPermissionModalOpen,
  };
};

export default PermissionModuleController;
