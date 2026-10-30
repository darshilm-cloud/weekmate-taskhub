/* eslint-disable react-hooks/exhaustive-deps */
import { Button, Card, Popconfirm, Table, Tabs } from "antd";
import React, { useState, useEffect } from "react";
import { useLocation, useHistory } from "react-router-dom";
import queryString from "query-string";
import TaskTrashController from "./TaskTrash/TaskTrashController";
import ProjectTrashController from "./ProjectTrash/ProjectTrashController";
import DiscussionTrash from "./DiscussionTrashControl/DiscussionTrash";
import TimeLogTrashController from "./TimeLoggedTrash/TimeLogTrashController";
import BugsTrashController from "./BugsTrashController/BugsTrashController";
import { RollbackOutlined } from "@ant-design/icons";
import { DeleteActionIcon } from "../../components/common/ActionIcons";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import NotesController from "./NotesController/NotesController";
import { TrashSkeleton, TrashTableSkeleton } from "../../components/common/SkeletonLoader";
import ColumnSelector from "../../components/common/ColumnSelector";
import useColumnVisibility from "../../hooks/useColumnVisibility";
import "./trashstyle.css";
import TrashFilter from "./TrashFilter";

const TRASH_TABS = ["Project", "Discussion", "Tasks", "Bugs", "Notes", "Time"];
const COLUMN_LOCKED = ["projectTitle"];

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
    pageSize: 25,
  });
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const location = useLocation();
  const { tab, taskID, listID } = queryString.parse(location.search);
  const [selectedTab, setSelectedTab] = useState(tab || "Project");
  const [pageLoading, setPageLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  // "Created Date" filter: [dayjs, dayjs] | null — matches the item's createdAt, not the deletion date
  const [createdRange, setCreatedRange] = useState(null);
  const history = useHistory();
  const handleLiClick = tab => {
    setSelectedTab(tab);
    setSelectedRowKeys([]);
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
  const updateTable = async () => {
    const filters = {
      ...(createdRange?.[0] ? { start_date: createdRange[0].format("YYYY-MM-DD") } : {}),
      ...(createdRange?.[1] ? { end_date: createdRange[1].format("YYYY-MM-DD") } : {}),
    };
    switch (selectedTab) {
      case "Discussion":
        await getDiscussionTrash(data => {
          setColumns(DiscussionTrashColumns);
          setTableData(data);
        }, filters);
        break;

      case "Project":
        await getProjectTrash(data => {
          setColumns(ProjectTrashColumns);
          setTableData(data);
        }, filters);
        break;

      case "Bugs":
        await getBugTrash(data => {
          setColumns(BugsTrashColumns);
          setTableData(data);
        }, filters);
        break;

      case "Tasks":
        await getTaskTrash(data => {
          setColumns(TaskTrashColumns);
          setTableData(data);
        }, filters);
        break;

      case "Notes":
        await getNotesTrash(data => {
          setColumns(notesTrashColumns);
          setTableData(data);
        }, filters);
        break;

      case "Time":
        await getTimeLoggedTrash(data => {
          setColumns(TimeLoggedTrashColumns);
          setTableData(data);
        }, filters);
        break;

      default:
        await getProjectTrash(data => {
          setColumns(ProjectTrashColumns);
          setTableData(data);
        }, filters);
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
  }, [selectedTab, createdRange]);

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
        setSelectedRowKeys([]);
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
        setSelectedRowKeys([]);
        updateTable();
      }
    } catch (error) {
      console.log(error);
    }
  };
  // Each tab keeps its own saved column choice ("trash-<tab>").
  const { visibleKeys, saveVisibleKeys, filteredColumns, saving: savingColumns } =
    useColumnVisibility(`trash-${selectedTab.toLowerCase()}`, columns, [], COLUMN_LOCKED);

  const isAnyRowSelected = selectedRowKeys.length > 0;
  if (pageLoading) return <TrashSkeleton />;
  return (
    <Card className="ps-page main-trash-wrapper">
      <div className="heading-wrapper">
        <div className="heading-main">
          <h2>Trash</h2>
        </div>
        <div className="ps-header-right">
          <TrashFilter
            value={ createdRange }
            onApply={ (range) => {
              setSelectedRowKeys([]);
              setCreatedRange(range);
            } }
          />
          <Popconfirm
            title="Do you really want to Restore?"
            okText="Yes"
            cancelText="No"
            onConfirm={ handleRestore }
            disabled={ !isAnyRowSelected }
          >
            <Button icon={ <RollbackOutlined /> } disabled={ !isAnyRowSelected }>
              Restore{ isAnyRowSelected ? ` (${selectedRowKeys.length})` : "" }
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Delete the selected items permanently?"
            okText="Yes"
            cancelText="No"
            onConfirm={ handleDelete }
            disabled={ !isAnyRowSelected }
          >
            <Button icon={ <DeleteActionIcon /> } disabled={ !isAnyRowSelected }>
              Delete{ isAnyRowSelected ? ` (${selectedRowKeys.length})` : "" }
            </Button>
          </Popconfirm>
          <ColumnSelector
            columns={ columns }
            visibleKeys={ visibleKeys }
            alwaysVisibleKeys={ COLUMN_LOCKED }
            onSave={ saveVisibleKeys }
            saving={ savingColumns }
          />
        </div>
      </div>

      <Card className="main-content-wrapper">
        <Tabs
          className="trash-tabs"
          activeKey={ selectedTab }
          onChange={ handleLiClick }
          items={ TRASH_TABS.map((key) => ({ key, label: key })) }
        />
        <div className="block-table-content">
          { tableLoading ? (
            <TrashTableSkeleton />
          ) : (
            <Table
              key={ selectedTab }
              loading={ false }
              rowSelection={ rowSelection }
              scroll={ { x: "100%" } }
              columns={ filteredColumns }
              dataSource={ tableData }
              pagination={ {
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "25", "50", "100"],
                ...pagination,
              } }
              rowKey="_id"
            />
          ) }
        </div>
      </Card>
    </Card>
  );
};

export default MainTrashBoard;
