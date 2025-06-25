import React from "react";
import {FormattedMessage, injectIntl} from "react-intl";

function InjectMassage(props) {
  return <FormattedMessage {...props} />
}
export default injectIntl(InjectMassage, {
  withRef: false
});
