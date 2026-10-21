import { useEffect } from "react";

// Scrolling inside these doesn't count - e.g. scrolling the Columns list or a
// Select's options must not close them.
const POPUP_CONTAINERS =
  ".ant-dropdown, .ant-popover, .ant-select-dropdown, .ant-picker-dropdown, .ant-cascader-dropdown";

const OPEN_POPUPS =
  ".ant-dropdown:not(.ant-dropdown-hidden), .ant-popover:not(.ant-popover-hidden)";

/**
 * Closes open click-triggered dropdowns/popovers (Columns, Filter, row "⋮"
 * menus, …) when the page scrolls, instead of leaving them floating away
 * from their button. antd's popups close on a mousedown outside them
 * (@rc-component/trigger useWinClick), so we fire one on <body> - the same as
 * clicking away. Modals are not closed (they may hold unsaved form input).
 */
const useClosePopupsOnScroll = () => {
  useEffect(() => {
    let frame = 0;

    const onScroll = (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(POPUP_CONTAINERS)) return;
      if (!document.querySelector(OPEN_POPUPS)) return;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      });
    };

    // capture: element scroll events don't bubble, so listen on the way down.
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      cancelAnimationFrame(frame);
    };
  }, []);
};

export default useClosePopupsOnScroll;
