import { Button, Form, Input, message, Rate, Card } from "antd";
import React, { useState, useEffect } from "react";
import "./EmployeeFeedback.css";
import "../../assets/css/pms.css";
import "../../assets/css/style.css";
import Service from "../../service";
import { useParams } from "react-router-dom";

const EmployeeFeedback = () => {
  const [form] = Form.useForm();
  const { complaintId } = useParams();
  const [formSubmit, setformSubmit] = useState(false);
  const [getFeedbacksDetailsForMail, setgetFeedbacksDetailsForMail] =
    useState(false);
  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 8 },
    },
    wrapperCol: {
      xs: { span: 24 },
      sm: { span: 16 },
    },
  };

  const getData = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getconsumerResolutionData,
        body: {
          complaint_id: complaintId,
        },
      });
      if (response.data && response.data?.data?.length > 0) {
        setgetFeedbacksDetailsForMail(true);
      } else {
        setgetFeedbacksDetailsForMail(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const reqBody = {
        complaint_id: complaintId,
        satisfaction: values?.satisfaction,
        rate_reviews: values?.rate_reviews,
        ratings: values?.ratings,
        additional_comments: values?.additional_comments,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.consumerResolutionForm,
        body: reqBody,
      });
      if (response.data && response.data.data) {
        message.success(response.data.message);
        setformSubmit(true);
      } else {
        message.error(response?.data?.message);
        setformSubmit(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getData();
  }, []);
  return (
    <div className="gx-app-login-wrap account-login">
      <div className="gx-app-login-container">
        <div className="gx-app-login-main-content">
          <div className="gx-app-logo-content feedback-form-div-first">
            <div
              className="gx-app-logo"
              style={{ paddingBottom: "80px" }}
            ></div>
          </div>

          <div className="gx-app-login-content feedback-form-div-second">
            <Card style={{ overflowX: "hidden", margin: "0" }}>
              {getFeedbacksDetailsForMail && (
                <>
                  <div className="greeting-msg-feedback">
                    <h1 className="message-gratitude">
                      {" "}
                      Feedback already submitted!
                    </h1>
                  </div>
                </>
              )}
              {formSubmit && (
                <>
                  {console.log("formSubmitformSubmit", formSubmit)}
                  <div className="greeting-msg-feedback">
                    <div className="icon-checked-submitted-feedback">
                      <i class="fa-regular fa-circle-check"></i>
                    </div>
                    <h1 className="message-gratitude"> Thank You!</h1>
                    <p>Your Feedback has been recieved.</p>
                  </div>
                </>
              )}

              {!getFeedbacksDetailsForMail && !formSubmit && (
                <>
                  <div className="inout-header">
                    <h2>Complaint Resolution Feedback</h2>
                  </div>
                  <Form
                    form={form}
                    noValidate
                    {...formItemLayout}
                    onFinish={handleSubmit}
                    className="complaint-consumer-resolution-feedback-form"
                  >
                    <Form.Item
                      name="satisfaction"
                      label="How satisfied are you with the resolution of your complaint?"
                      rules={[
                        {
                          required: true,
                          message: "Please describe your satisfaction level!",
                        },
                      ]}
                    >
                      <Rate allowHalf count={5} />
                    </Form.Item>

                    <Form.Item
                      name="rate_reviews"
                      label="How would you rate the time it took to resolve your complaint?"
                      rules={[
                        {
                          required: true,
                          message: "Please rate the time it took!",
                        },
                      ]}
                    >
                      <Rate allowHalf count={5} />
                    </Form.Item>

                    <Form.Item
                      name="additional_comments"
                      label="Additional Comments"
                    >
                      <Input.TextArea placeholder="Any additional comments..." />
                    </Form.Item>

                    <div className="popover-footer-btn">
                      {/* Submit button */}
                      <Button
                        type="primary"
                        className="square-primary-btn"
                        htmlType="submit"
                      >
                        Submit
                      </Button>

                      {/* Clear button */}
                      <Button
                        className="square-outline-btn ant-delete"
                        onClick={() => {
                          form.resetFields(); // Clear form fields
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </Form>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeFeedback;
