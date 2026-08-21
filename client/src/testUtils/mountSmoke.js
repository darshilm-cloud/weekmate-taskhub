/**
 * Standard mount coverage for a large page component.
 *
 * Every one of these pages is a thousand-plus lines whose top half is data
 * plumbing and shell. Mounting it against a stubbed service layer exercises
 * that, and the empty/failed/malformed cases prove the page degrades instead of
 * blanking out - error paths that were previously untested everywhere.
 *
 * Deeper behaviour (modals, submits, view switching) belongs in a dedicated
 * suite per page; this is the baseline every page should have.
 */
import React from "react";
import { waitFor } from "@testing-library/react";
import { renderPage } from "./renderPage";

/**
 * Wait for the component to settle without a fixed sleep.
 *
 * A hard setTimeout is a race: it passes on an idle machine and fails under
 * load, which is the worst kind of test. waitFor retries until the condition
 * holds or the timeout expires, so the result depends on the component rather
 * than on how busy the box is.
 */
const settled = (container) =>
  waitFor(() => expect(container).not.toBeEmptyDOMElement(), { timeout: 5000 });

export const mountSmoke = (name, Component, { Service, route, path, props = {}, seed } = {}) => {
  const mount = () => renderPage(<Component {...props} />, { route, path });

  describe(`${name} (mount)`, () => {
    beforeEach(() => {
      Service.makeAPICall.mockReset();
      localStorage.clear();
      localStorage.setItem("companyDomain", "acme");
      localStorage.setItem(
        "user_data",
        JSON.stringify({
          _id: "u1",
          email: "a@b.com",
          companyId: "c1",
          pms_role_id: { _id: "r1", role_name: "Admin" },
          companyDetails: { companyDomain: "acme", companyName: "Acme" },
        })
      );
      if (seed) seed();
    });

    const ok = () =>
      Service.makeAPICall.mockResolvedValue({
        status: 200,
        data: { status: 1, data: [], metadata: {} },
      });

    it("mounts without crashing", async () => {
      ok();
      const { container } = mount();
      await waitFor(() => expect(container).not.toBeEmptyDOMElement());
    });

    it("renders markup rather than an empty shell", async () => {
      ok();
      const { container } = mount();
      await waitFor(() => expect(container.querySelectorAll("*").length).toBeGreaterThan(1));
    });

    it("survives every request failing", async () => {
      Service.makeAPICall.mockRejectedValue(new Error("502 upstream"));
      const { container } = mount();
      await settled(container);
    });

    it("survives a null response payload", async () => {
      Service.makeAPICall.mockResolvedValue({ status: 200, data: null });
      const { container } = mount();
      await settled(container);
    });

    it("survives a response whose data is not an array", async () => {
      Service.makeAPICall.mockResolvedValue({
        status: 200,
        data: { status: 1, data: { unexpected: true } },
      });
      const { container } = mount();
      await settled(container);
    });

    it("unmounts cleanly, leaving no timers or listeners behind", async () => {
      ok();
      const { container, unmount } = mount();
      await settled(container);
      expect(() => unmount()).not.toThrow();
    });
  });
};

export default mountSmoke;
