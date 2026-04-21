/* eslint-disable react-hooks/exhaustive-deps */
import { Button, Card, Menu, Popconfirm, Popover, Table, Tooltip } from "antd";
import React, { useState, useEffect } from "react";
import { useLocation, useHistory } from "react-router-dom";
import queryString from "query-string";
import TaskTrashController from "./TaskTrash/TaskTrashController";
import ProjectTrashController from "./ProjectTrash/ProjectTrashController";
import DiscussionTrash from "./DiscussionTrashControl/DiscussionTrash";
import TimeLogTrashController from "./TimeLoggedTrash/TimeLogTrashController";
import BugsTrashController from "./BugsTrashController/BugsTrashController";
import { RollbackOutlined } from "@ant-design/icons";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import { AiOutlineDelete } from "react-icons/ai";
import NotesController from "./NotesController/NotesController";
import { TrashSkeleton, TrashTableSkeleton } from "../../components/common/SkeletonLoader";
import "./trashstyle.css";

const MainTrashBoard = () => {
  const dispatch = useDispatch();
  const { DiscussionTrashColumns, getDiscussionTrash } = DiscussionTrash();
  const { ProjectTrashColumns, getProjectTrash } = ProjectTrashController();
  const { TaskTrashColumns, getTaskTrash } = TaskTrashController();
  const { getTimeLoggedTrash, TimeLoggedTrashColumns } =
    TimeLogTrashController();
  const { getNotesTrash, notesTrashColumns } = NotesController();
  const { getBugTrash, BugsTrashColumns } = BugsTrashController();

  const [pagination] = useState({
    current: 1,
    pageSize: 30,
  });
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const location = useLocation();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { tab, taskID, listID } = queryString.parse(location.search);
  const [selectedTab, setSelectedTab] = useState(tab || "Project");
  const [pageLoading, setPageLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const history = useHistory();
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  const handleLiClick = tab => {
    setSelectedTab(tab);
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("tab", tab);
    if (taskID) {
      searchParams.set("listID", listID);
      searchParams.delete("taskID", taskID);
    }

    history.push({
      pathname: window.location.pathname,
      search: searchParams.toString(),
    });
  };

  const onSelectChange = newSelectedRowKeys => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    getCheckboxProps: record => ({
      // disabled: record.disabled,
    }),
  };
  const showTotal = total => `Total Records Count is ${total}`;
  const tabOptions = [
    {
      key: "Project",
      label: (
        <Menu.Item onClick={ () => handleLiClick("Project") }>Project</Menu.Item>
      ),
    },
    {
      key: "Discussion",
      label: (
        <Menu.Item onClick={ () => handleLiClick("Discussion") }>
          Discussion
        </Menu.Item>
      ),
    },
    {
      key: "Tasks",
      label: (
        <Menu.Item onClick={ () => handleLiClick("Tasks") }>Tasks</Menu.Item>
      ),
    },
    {
      key: "Bugs",
      label: <Menu.Item onClick={ () => handleLiClick("Bugs") }>Bugs</Menu.Item>,
    },
    {
      key: "Notes",
      label: (
        <Menu.Item onClick={ () => handleLiClick("Notes") }>Notes</Menu.Item>
      ),
    },

    {
      key: "Time",
      label: <Menu.Item onClick={ () => handleLiClick("Time") }>Time</Menu.Item>,
    },
  ];
  const updateTable = async () => {
    switch (selectedTab) {
      case "Discussion":
        await getDiscussionTrash(data => {
          setColumns(DiscussionTrashColumns);
          setTableData(data);
        });
        break;

      case "Project":
        await getProjectTrash(data => {
          setColumns(ProjectTrashColumns);
          setTableData(data);
        });
        break;

      case "Bugs":
        await getBugTrash(data => {
          setColumns(BugsTrashColumns);
          setTableData(data);
        });
        break;

      case "Tasks":
        await getTaskTrash(data => {
          setColumns(TaskTrashColumns);
          setTableData(data);
        });
        break;

      case "Notes":
        await getNotesTrash(data => {
          setColumns(notesTrashColumns);
          setTableData(data);
        });
        break;

      case "Time":
        await getTimeLoggedTrash(data => {
          setColumns(TimeLoggedTrashColumns);
          setTableData(data);
        });
        break;

      default:
        await getProjectTrash(data => {
          setColumns(ProjectTrashColumns);
          setTableData(data);
        });
        break;
    }
  };

  // updateTable is stable for our use; avoid exhaustive deps churn
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setTableLoading(true);
    setTableData([]);
    updateTable().finally(() => {
      setPageLoading(false);
      setTableLoading(false);
    });
  }, [selectedTab]);

  const Payload = () => {
    const payload = {
      project_ids: [],
      discussion_ids: [],
      task_ids: [],
      bug_ids: [],
      note_ids: [],
      logged_time_ids: [],
    };

    selectedRowKeys.forEach(id => {
      switch (selectedTab) {
        case "Project":
          payload.project_ids.push(id);
          break;
        case "Discussion":
          payload.discussion_ids.push(id);
          break;
        case "Tasks":
          payload.task_ids.push(id);
          break;
        case "Bugs":
          payload.bug_ids.push(id);
          break;
        case "Notes":
          payload.note_ids.push(id);
          break;
        case "Time":
          payload.logged_time_ids.push(id);
          break;
        default:
          break;
      }
    });

    return payload;
  };

  const handleDelete = async () => {
    try {
      dispatch(showAuthLoader());
      const payload = Payload();
      console.log("Delete Payload:", payload);

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.Trashdelete,
        body: payload,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        updateTable();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleRestore = async () => {
    try {
      dispatch(showAuthLoader());
      const payload = Payload();
      console.log("Delete Payload:", payload);

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.TrashRestore,
        body: payload,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        updateTable();
      }
    } catch (error) {
      console.log(error);
    }
  };
  const isAnyRowSelected = selectedRowKeys.length > 0;
  if (pageLoading) return <TrashSkeleton />;
  return (
    <>
      <div className="main-trash-wrapper">
        <Card>
          <div className="heading-wrapper">
            <h2>Trash</h2>
          </div>

          <div className="global-search">
            { windowWidth <= 991 ? (
              <>
                <Popover
                  content={
                    <Menu>
                      { tabOptions.map(option => (
                        <Menu.Item
                          key={ option.key }
                          onClick={ () => handleLiClick(option.key) }
                        >
                          { option.label }
                        </Menu.Item>
                      )) }
                    </Menu>
                  }
                  placement="bottomLeft"
                  trigger="click"
                >
                  <div className="header_tabination">
                    <i class="fi fi-bs-menu-dots"></i>
                  </div>
                </Popover>
              </>
            ) : (
              <div className="header_tabination">
                <ul className="tab_menu">
                  <li
                    className={ selectedTab === "Project" ? "active-tab" : "" }
                    onClick={ () => handleLiClick("Project") }
                  >
                    Project
                  </li>
                  <li
                    className={ selectedTab === "Discussion" ? "active-tab" : "" }
                    onClick={ () => handleLiClick("Discussion") }
                  >
                    Discussion
                  </li>
                  <li
                    className={ selectedTab === "Tasks" ? "active-tab" : "" }
                    onClick={ () => handleLiClick("Tasks") }
                  >
                    Tasks
                  </li>
                  <li
                    className={ selectedTab === "Bugs" ? "active-tab" : "" }
                    onClick={ () => handleLiClick("Bugs") }
                  >
                    Bugs
                  </li>
                  <li
                    className={ selectedTab === "Notes" ? "active-tab" : "" }
                    onClick={ () => handleLiClick("Notes") }
                  >
                    Notes
                  </li>

                  <li
                    className={ selectedTab === "Time" ? "active-tab" : "" }
                    onClick={ () => handleLiClick("Time") }
                  >
                    Time
                  </li>
                </ul>
                <div className="action-buttons">
                  <Tooltip title="Restore">
                    <Popconfirm
                      title="Do you really want to Restore?"
                      okText="Yes"
                      cancelText="No"
                      onConfirm={ handleRestore }
                    >
                      <Button type="link success" disabled={ !isAnyRowSelected }>
                        <RollbackOutlined />
                      </Button>
                    </Popconfirm>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <Popconfirm
                      title="Do you really want to Delete?"
                      okText="Yes"
                      cancelText="No"
                      onConfirm={ handleDelete }
                    >
                      <Button type="link delete" disabled={ !isAnyRowSelected }>
                        <AiOutlineDelete
                          style={ { fontSize: "18px", color: "red" } }
                        />
                      </Button>
                    </Popconfirm>
                  </Tooltip>
                </div>
              </div>
            ) }
          </div>


          <div className="table-content">
            { tableLoading ? (
              <TrashTableSkeleton />
            ) : (
              <Table
                rowSelection={ rowSelection }
                scroll={ {
                  x: "100%",
                } }
                columns={ columns }
                dataSource={ tableData }
                pagination={ {
                  showSizeChanger: true,
                  pageSizeOptions: ["10", "20", "25", "30"],
                  showTotal: showTotal,
                  ...pagination,
                } }
                rowKey="_id"
              />
            ) }
          </div>
        </Card>
      </div>
    </>
  );
};

export default MainTrashBoard;
