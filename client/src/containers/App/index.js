import React, { memo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import URLSearchParams from "url-search-params";
import {
  Redirect,
  Route,
  Switch,
  useHistory,
  useLocation,
  useRouteMatch,
} from "react-router-dom";
import { ConfigProvider, message } from "antd";
import { IntlProvider } from "react-intl";
import AppLocale from "../../lngProvider";
import MainApp from "./MainApp";
import SignIn from "../SignIn";
import CompanyRegistration from "../../pages/RegisterCompany";
import ForgotPassword from "../ForgotPassword";
import ResetPassword from "../ResetPassword";
import {
  hideAuthLoader,
  setInitUrl,
  showAuthLoader,
} from "../../appRedux/actions/Auth";
import {
  onLayoutTypeChange,
  onNavStyleChange,
  setThemeType,
} from "../../appRedux/actions/Setting";
import CircularProgress from "../../components/CircularProgress";
import PropTypes from "prop-types";
import {
  LAYOUT_TYPE_BOXED,
  LAYOUT_TYPE_FRAMED,
  LAYOUT_TYPE_FULL,
  NAV_STYLE_ABOVE_HEADER,
  NAV_STYLE_BELOW_HEADER,
  NAV_STYLE_DARK_HORIZONTAL,
  NAV_STYLE_DEFAULT_HORIZONTAL,
  NAV_STYLE_INSIDE_HEADER_HORIZONTAL,
  THEME_TYPE_DARK,
} from "../../constants/ThemeSetting";
import { SocketProvider, useSocket } from "../../context/SocketContext";
import { useSocketAction } from "../../hooks/useSocketAction";
import { socketEvents } from "../../settings/socketEventName";
import Unauthorised from "../../components/Unauthorised/Unauthorised";
import Service from "../../service";
import EmployeeFeedback from "../../components/Feedback/EmployeeFeedback";

function RestrictedRoute({
  component: Component,
  location,
  authUser,
  ...rest
}) {
  const history = useHistory();
  const socket = useSocket();
  const { emitEvent, listenEvent, showBrowserNotification } = useSocketAction();
  const accessToken = localStorage.getItem("accessToken")
    ? localStorage.getItem("accessToken")
    : null;

  useEffect(() => {
    getUserInfo();
  }, [history.location.pathname]);

  // Function to request notification permission
  const requestNotificationPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    if (authUser) {
      requestNotificationPermission();
      // Emit events as component mounts
      const emitEvents = async () => {
        await emitEvent(socketEvents.USER_ACTIVITY, {
          data: "socket connection ok",
          status: 200,
        });

        await emitEvent(socketEvents.JOIN_ROOM, { userId: authUser._id });
      };

      emitEvents().catch(console.error);

      const notificationCleanup = listenEvent(
        socketEvents.NOTIFICATIONS,
        (data) => {
          console.log("🚀 ~ useEffect ~ data:", data);
          showBrowserNotification("New Notification", data.message, data.type);
        }
      );

      return () => {
        if (notificationCleanup) notificationCleanup();
      };
    }
  }, [authUser, history, socket]);

  const getUserInfo = async () => {
    console.log(authUser, "authUser._idT");
    try {
      if (!authUser || !authUser._id) {
        history.push("/signin");
        return;
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Route
      {...rest}
      render={(props) =>
        authUser && accessToken ? (
          <Component {...props} />
        ) : (
          <Redirect
            to={{
              pathname: "/signin",
              state: { from: location },
            }}
          />
        )
      }
    />
  );
}

function AuthRoute({ component: Component, location, authUser, ...rest }) {
  return (
    <Route
      {...rest}
      render={(props) =>
        !authUser ? (
          (console.log(authUser, "authUser"), (<Component {...props} />))
        ) : (
          <Redirect
            to={{
              pathname: "/signin",
            }}
          />
        )
      }
    />
  );
}

function App() {
  const dispatch = useDispatch();
  const { locale, themeType, navStyle, layoutType, themeColor } = useSelector(
    ({ settings }) => settings
  );
  const { loader, alertMessage, showMessage, authUser, initURL } = useSelector(
    ({ auth }) => auth
  );
  const location = useLocation();
  const history = useHistory();
  const match = useRouteMatch();

  useEffect(() => {
    const link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = `/css/${themeColor}.css`;

    link.className = "gx-style";
    document.body.appendChild(link);
  }, []);

  useEffect(() => {
    if (initURL === "") {
      dispatch(setInitUrl(location.pathname));
    }
    const params = new URLSearchParams(location.search);

    if (params.has("theme")) {
      dispatch(setThemeType(params.get("theme")));
    }
    if (params.has("nav-style")) {
      dispatch(onNavStyleChange(params.get("nav-style")));
    }
    if (params.has("layout-type")) {
      dispatch(onLayoutTypeChange(params.get("layout-type")));
    }
    setLayoutType(layoutType);
    setNavStyle(navStyle);
  });

  const setLayoutType = (layoutType) => {
    if (layoutType === LAYOUT_TYPE_FULL) {
      document.body.classList.remove("boxed-layout");
      document.body.classList.remove("framed-layout");
      document.body.classList.add("full-layout");
    } else if (layoutType === LAYOUT_TYPE_BOXED) {
      document.body.classList.remove("full-layout");
      document.body.classList.remove("framed-layout");
      document.body.classList.add("boxed-layout");
    } else if (layoutType === LAYOUT_TYPE_FRAMED) {
      document.body.classList.remove("boxed-layout");
      document.body.classList.remove("full-layout");
      document.body.classList.add("framed-layout");
    }
  };

  const setNavStyle = (navStyle) => {
    if (
      navStyle === NAV_STYLE_DEFAULT_HORIZONTAL ||
      navStyle === NAV_STYLE_DARK_HORIZONTAL ||
      navStyle === NAV_STYLE_INSIDE_HEADER_HORIZONTAL ||
      navStyle === NAV_STYLE_ABOVE_HEADER ||
      navStyle === NAV_STYLE_BELOW_HEADER
    ) {
      document.body.classList.add("full-scroll");
      document.body.classList.add("horizontal-layout");
    } else {
      document.body.classList.remove("full-scroll");
      document.body.classList.remove("horizontal-layout");
    }
  };

  useEffect(() => {
    if (location.pathname === "/") {
      if (authUser === null) {
        history.push("/signin");
      } else if (initURL === "" || initURL === "/" || initURL === "/signin") {
        history.push("/dashboard");
      } else {
        history.push(initURL);
      }
    }

    if (location.pathname == "/signin") {
      if (authUser != null) {
        history.push("/dashboard");
      }
    }
  }, [authUser, initURL, location, history]);

  useEffect(() => {
    if (themeType === THEME_TYPE_DARK) {
      document.body.classList.add("dark-theme");
      document.body.classList.add("dark-theme");
      const link = document.createElement("link");
      link.type = "text/css";
      link.rel = "stylesheet";
      link.href = "/css/dark_theme.css";
      link.className = "style_dark_theme";
      document.body.appendChild(link);
    }
  }, []);

  useEffect(() => {
    generalSettingApp();
  }, []);

  const generalSettingApp = async () => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        api_url: Service.getGeneralSetting,
        methodName: Service.getMethod,
      });
      if (response?.data && response?.data?.data) {
        dispatch(hideAuthLoader());
        localStorage.setItem("title", response?.data?.data.title);
        localStorage.setItem("favIcon", response?.data?.data.fav_icon);
        localStorage.setItem("headerLogo", response?.data?.data.header_logo);
        localStorage.setItem("loginLogo", response?.data?.data.login_logo);
        localStorage.setItem("logoMode", response?.data?.data.logo_mode);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error, "getGeneral setting error");
    }
  };

  const currentAppLocale = AppLocale[locale.locale];

  return (
    <SocketProvider user={authUser}>
      <ConfigProvider locale={currentAppLocale.antd}>
        <IntlProvider
          locale={currentAppLocale.locale}
          messages={currentAppLocale.messages}
        >
          {loader ? (
            <div className="gx-loader-view">
              <CircularProgress />
            </div>
          ) : null}
          {showMessage ? message.error(alertMessage.toString()) : null}
          <Switch>
            <AuthRoute
              path={`${match.url}signin`}
              authUser={authUser}
              location={location}
              component={SignIn}
            />
            <AuthRoute
              path={`${match.url}register-company`}
              component={CompanyRegistration}
            />
            <AuthRoute
              path={`${match.url}forgot-password`}
              component={ForgotPassword}
            />
            <AuthRoute
              path={`${match.url}feedback/:complaintId`}
              component={EmployeeFeedback}
            />
            <AuthRoute
              path={`${match.url}reset-password/:token`}
              component={ResetPassword}
            />
            <AuthRoute
              path={`${match.url}unauthorised`}
              component={Unauthorised}
            />
            <RestrictedRoute
              path={`${match.url}`}
              authUser={authUser}
              location={location}
              component={MainApp}
            />
          </Switch>
        </IntlProvider>
      </ConfigProvider>
    </SocketProvider>
  );
}

RestrictedRoute.propTypes = {
  component: PropTypes.elementType.isRequired,
  location: PropTypes.object.isRequired,
  authUser: PropTypes.any,
};

AuthRoute.propTypes = {
  component: PropTypes.elementType.isRequired,
  location: PropTypes.object,
  authUser: PropTypes.any,
};

export default memo(App);
