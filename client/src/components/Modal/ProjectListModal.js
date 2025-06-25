import React, { useCallback, useState } from "react";
import { Modal, Collapse, Form, Input } from "antd";
import { FieldTimeOutlined, FolderOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import "./ProjectListModal.css";
import { debounce } from "lodash";

const ProjectListModal = ({
  projectDetails,
  recentList,
  isModalOpen,
  handleCancel,
  addVisitedData,
  setIsModalOpen,
  form,
  getProjectListing,
}) => {
  const [isSearching, setIsSearching] = useState(true);

  const onSearch = useCallback(
    debounce((value) => {
      if (value.trim()) {
        getProjectListing(value);
      }
    }, 500),
    []
  );

  const handleInputChange = (event) => {
    const { value } = event.target;
    if (value.trim() !== "") {
      setIsSearching(false);
    }
    onSearch(value);
  };

  const formattedTitle = (title) => {
    return title?.replace(/(?:^|\s)([a-z])/g, function (match, group1) {
      return match?.charAt(0) + group1?.toUpperCase();
    });
  };

  return (
    <Modal
      footer={false}
      open={isModalOpen}
      width={800}
      closable={false}
      onCancel={handleCancel}
      className="project-add-wrapper"
    >
      <div
        className="modal-header project-search-input"
        style={{ padding: "0", borderBottom: "none" }}
      >
        <Form form={form}>
          <Form.Item name="title">
            <Input
              onChange={handleInputChange}
              bordered={false}
              style={{
                height: "52px",
                margin: "0",
                outline: "none",
                boxShadow: "#0e304854 0px 1px 7px 0px",
              }}
              placeholder="Search Projects..."
            />
          </Form.Item>
        </Form>
      </div>
      <div className="list-project">
        <div>
          {recentList && recentList.length > 0 && isSearching && (
            <Collapse
              size="small"
              defaultActiveKey={["1"]}
              items={[
                {
                  key: "1",
                  label: (
                    <span>
                      <FieldTimeOutlined />
                      &nbsp;&nbsp;Recents
                    </span>
                  ),
                  children: (
                    <>
                      {recentList.map((item) => (
                        <>
                          <div
                            key={item.project_id}
                            style={{
                              marginLeft: "20px",
                              wordBreak: "break-word",
                              width: "100%",
                              maxWidth: "591px",
                            }}
                            className="project_title_main_div"
                          >
                            <Link
                              to={`/project/app/${item.project_id}?tab=${item?.defaultTab?.name}`}
                              onClick={() => {
                                setIsModalOpen(false);
                                form.resetFields();
                              }}
                            >
                              <span>
                                {formattedTitle(item?.project?.title)}
                              </span>
                            </Link>
                          </div>
                          <hr />
                        </>
                      ))}
                    </>
                  ),
                },
              ]}
            />
          )}

          <Collapse
            size="small"
            defaultActiveKey={["1"]}
            items={[
              {
                key: "1",
                label: (
                  <>
                    <FolderOutlined />
                    &nbsp;&nbsp;Projects
                  </>
                ),
                children: (
                  <>
                    {projectDetails && projectDetails.length > 0 ? (
                      projectDetails.map((item) => (
                        <>
                          <div
                            key={item._id}
                            style={{
                              marginLeft: "20px",
                              wordBreak: "break-word",
                              width: "100%",
                              maxWidth: "591px",
                            }}
                            className="project_title_main_div"
                          >
                            <Link
                              to={`/project/app/${item._id}?tab=Tasks`}
                              onClick={() => {
                                setIsSearching(true);
                                addVisitedData(item._id);
                                setIsModalOpen(false);
                                form.resetFields();
                              }}
                            >
                              <span>{formattedTitle(item?.title)}</span>
                            </Link>
                          </div>
                          <hr />
                        </>
                      ))
                    ) : (
                      <div className="no-data-div-search">No Record Found</div>
                    )}
                  </>
                ),
              },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ProjectListModal;
