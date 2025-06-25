
import Cookie from 'js-cookie'
const setCookie = (cookieName, cookieData, cookieAttribute) => {
     Cookie.set(cookieName, cookieData, cookieAttribute)
}

export default setCookie;