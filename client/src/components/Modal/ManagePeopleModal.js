import React, { useState } from "react";
import { Modal, Form, Button, Select, Row, Col } from "antd";
import MultiSelect from "../CustomSelect/MultiSelect";
import MyAvatar from "../Avatar/MyAvatar";
import { removeTitle } from "../../util/nameFilter";

const ManagePeopleModal = ({
  open,
  cancel,
  formName,
  onFinish,
  setDetailsClientSubs,
  detailClientSubs,
  subscribersList,
  clientsList,
  type,
  onChange,
  assignees,
  clients,
  loading,
  ...otherProps
}) => {
  const { managerList, manager, acc_manager, accManagerList } = otherProps;
  const [searchKeyword1, setSearchKeyword1] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const handleSearch1 = (searchValue) => {
    setSearchKeyword1(searchValue);
  };

  const handleSearch = (searchValue) => {
    setSearchKeyword(searchValue);
  };

  return (
  <Modal
  open={open}
  onCancel={cancel}
  title="Manage People"
  footer={[
       <Button
      key="cancel"
      className="delete-btn ant-delete"
      onClick={cancel}
    >
      Cancel
    </Button>,
    <Button
      key="save"
      type="primary"
      className="add-btn"
      onClick={() => formName.submit()}
      loading={loading}
    >
      Save
    </Button>,
 
  ]}
>
  <div className="overview-modal-wrapper">
    <Form form={formName} layout="vertical" onFinish={onFinish}>
      <div className="topic-cancel-wrapper task-list-pop-wrapper">
        <Row gutter={[0, 0]}>
          <Col xs={24}>
            <Form.Item name="assignees" label="Assignees" value={assignees}>
              <MultiSelect
                mode="multiple"
                style={{ width: "100%" }}
                showSearch
                onSearch={handleSearch1}
                search={searchKeyword1}
                maxTagCount={3}
                onChange={(values) => onChange("assignees", values)}
                listData={subscribersList}
                values={formName.getFieldValue("assignees")}
              />
            </Form.Item>
          </Col>

          {type == "project" && (
            <>
              <Col xs={24} sm={12}>
                <Form.Item label="Project Manager" name="manager" value={manager}>
                  <Select
                    showSearch
                    filterOption={(input, option) =>
                      option.children &&
                      option.children
                        .toString()
                        .toLowerCase()
                        .indexOf(input.toLowerCase()) >= 0
                    }
                    filterSort={(optionA, optionB) =>
                      optionA.children
                        .toString()
                        .toLowerCase()
                        .localeCompare(
                          optionB.children.toString().toLowerCase()
                        )
                    }
                    onChange={(value) => onChange("manager", value)}
                    optionFilterProp="children"
                  >
                    {managerList.map((item) => (
                      <Select.Option key={item._id} value={item._id}>
                        <>
                          <MyAvatar
                            userName={item?.manager_name}
                            src={item.emp_img}
                            alt={item?.manager_name}
                          />
                        </>
                        {removeTitle(item.manager_name)}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  label="Account Manager"
                  name="acc_manager"
                  value={acc_manager}
                >
                  <Select
                    showSearch
                    filterOption={(input, option) =>
                      option.children &&
                      option.children
                        .toString()
                        .toLowerCase()
                        .indexOf(input.toLowerCase()) >= 0
                    }
                    filterSort={(optionA, optionB) =>
                      optionA.children
                        .toString()
                        .toLowerCase()
                        .localeCompare(
                          optionB.children.toString().toLowerCase()
                        )
                    }
                    onChange={(value) => onChange("acc_manager", value)}
                    optionFilterProp="children"
                  >
                    {accManagerList.map((item) => (
                      <Select.Option key={item._id} value={item._id}>
                        <>
                          <MyAvatar
                            userName={item?.full_name}
                            src={item.emp_img}
                            alt={item?.full_name}
                          />
                        </>
                        {removeTitle(item.full_name)}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </>
          )}

          <Col xs={24}>
            <Form.Item label="Clients" name="clients" value={clients}>
              <MultiSelect
                mode="multiple"
                style={{ width: "100%" }}
                showSearch
                search={searchKeyword}
                onSearch={handleSearch}
                maxTagCount={3}
                onChange={(values) => onChange("clients", values)}
                listData={clientsList}
                values={formName.getFieldValue("clients")}
              />
            </Form.Item>
          </Col>
        </Row>
      </div>
    </Form>
  </div>
</Modal>
  );
};

export default ManagePeopleModal;
