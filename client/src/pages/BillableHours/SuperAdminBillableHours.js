import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Input,
  message,
  Modal,
  Popover,
  Radio,
  Table,
} from "antd";
import React, { useEffect, useState } from "react";
import { EyeOutlined } from "@ant-design/icons";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import Service from "../../service";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { removeTitle } from "../../util/nameFilter";
import dayjs from "dayjs";
import "./BillableHours.css";
import { getRoles } from "../../util/hasPermission";

const SuperAdminBillableHours = () => {
  const dispatch = useDispatch();
  const { authUser } = useSelector(({ auth }) => auth);

  const [billableHoursOfPC, setBillableHoursOfPC] = useState([]);
  const [openLoggedTimeModal, setopenLoggedTimeModal] = useState(false);
  const [openApprovedHoursModal, setOpenApprovedHoursModal] = useState(false);

  const [selectedEmployeeLogs, setSelectedEmployeeLogs] = useState([]);
  const [expandedRowKey, setExpandedRowKey] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [employeesList, setEmployeesList] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [searchAssignees, setSearchAssignees] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  const [grandTotalHours, setGrandTotalHours] = useState("");
  const [grandApprovedTotalHours, setGrandApprovedTotalHours] = useState("");
  const [departmentList, setDepartmentList] = useState([]);
  const [subDepartmentList, setSubDepartmentList] = useState([]);
  const [selectedProductivity, setSelectedProductivity] = useState("");
  const [selectedEmployeeRole, setSelectedEmployeeRole] = useState("");
  const [tempEmployeeRole, setTempEmployeeRole] =
    useState(selectedEmployeeRole);

  const [employeeId, setEmployeeId] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [approvedHours, setApprovedHours] = useState("");
  const [approvedMinutes, setApprovedMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [minuteError, setMinuteError] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [popOver, setPopOver] = useState({
    assignees: false,
    department: false,
    month: false,
    productivity: false,
    byRole: false,
  });

  const showTotal = (total) => `Total Records Count is ${total}`;

  useEffect(() => {
    getBillableoursOfPC();
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => {
    if (
      (tempEmployeeRole && tempEmployeeRole == "my_emp") ||
      getRoles(["PC", "AM"])
    ) {
      getEmployeesListRoleWise();
    } else {
      getEmployeesList();
    }
    getDepartmentList();
  }, []);

  const handleApprovedHoursChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setApprovedHours(value);
      setError(""); // Clear error if the input is valid
    } else {
      setError("Only numbers are allowed");
    }
  };

  const handleApprovedMinutesChange = (e) => {
    const value = e.target.value;

    // Allow only numbers and check if the number is between 0 and 59
    if (/^\d*$/.test(value)) {
      if (value >= 0 && value <= 59) {
        setApprovedMinutes(value);
        setMinuteError(""); // Clear error if the input is valid
      } else {
        setMinuteError("Minutes must be between 0 and 59");
      }
    } else {
      setMinuteError("Only numbers are allowed");
    }
  };

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
  };

  const handleTableChange = (page) => {
    setPagination({ ...pagination, ...page });
  };
  const handleVisibleChange = (key, visible) => {
    if (!visible) {
      setPopOver((prevState) => ({
        ...prevState,
        [key]: visible,
      }));
    } else {
      setPopOver((prevState) => ({
        ...prevState,
        [key]: !prevState[key],
      }));
    }
  };

  const handleFilters = (item) => {
    const isSelected = assignees.includes(item._id);
    if (isSelected) {
      setAssignees(assignees.filter((id) => id !== item._id)); // Remove if already selected
    } else {
      setAssignees([...assignees, item._id]); // Add if not selected
    }
  };

  const handleDepartmentFilters = (item) => {
    const isSelected = subDepartmentList.includes(item._id);
    if (isSelected) {
      setSubDepartmentList(subDepartmentList.filter((id) => id !== item._id)); // Remove if already selected
    } else {
      setSubDepartmentList([...subDepartmentList, item._id]); // Add if not selected
    }
  };

  const handleSearchTermAssignees = (e) => {
    setSearchAssignees(e.target.value);
  };

  const handleSearchDepartment = (e) => {
    setSearchDepartment(e.target.value);
  };

  const handleRoleChnage = (value) => {
    setTempEmployeeRole(value);
  };

  const handleApplyRoleChange = () => {
    setSelectedEmployeeRole(tempEmployeeRole);
  };

  const filteredEmployees = employeesList.filter((item) =>
    item.full_name.toLowerCase().includes(searchAssignees.toLowerCase())
  );

  const filteredDepartment = departmentList?.filter((item) =>
    item.sub_department_name
      ?.toLowerCase()
      ?.includes(searchDepartment?.toLowerCase())
  );

  const onMonthChange = (date, dateString) => {
    if (date) {
      const [year, month] = dateString.split("-");
      setSelectedMonth(month);
      setSelectedYear(year);
    }
  };

  const onCancel = () => {
    setopenLoggedTimeModal(false);
    setSelectedEmployeeLogs([]);
  };

  const onModalClose = () => {
    setOpenApprovedHoursModal(false);
  };

  const PCColumns = [
    {
      title: "Employee Name",
      dataIndex: "employee",
      render: (text) => {
        return (
          <div className="logged-by-wrapper">
            <span style={{ textTransform: "capitalize" }}>
              {" "}
              {removeTitle(text.name)}
            </span>
          </div>
        );
      },
    },
    {
      title: "Experience Level",

      render: (text) => {
        const { emp_exp_level } = text.employee;
        let emp_experience = "";
        if (emp_exp_level == "Junior") {
          emp_experience = "1-3";
        } else if (emp_exp_level == "Fresher") {
          emp_experience = "0-1";
        } else if (emp_exp_level == "Mid") {
          emp_experience = "3-5";
        } else if (emp_exp_level == "Senior") {
          emp_experience = "5+";
        }

        return (
          <div className="logged-by-wrapper">
            <span style={{ textTransform: "capitalize" }}>
              {emp_exp_level}
              {emp_experience && ` (${emp_experience})`}
            </span>
          </div>
        );
      },
    },
    {
      title: "Tracked Hours",
      render: (record) => {
        const { total_hours, total_minutes } = record.employee;
        return total_hours || total_minutes
          ? `${total_hours || 0} hrs ${total_minutes || 0} Mins`
          : "-";
      },
    },
    {
      title: "Expected Hours",
      render: (record) => {
        return record?.employee?.productivity?.expectedHours
          ? `${record?.employee?.productivity?.expectedHours.toFixed(2)} Hrs`
          : "-";
      },
    },
    {
      title: "Approved Hours",
      render: (record) => {
        const { approved_hours, approved_minutes } = record.employee;
        return approved_hours || approved_minutes
          ? `${approved_hours || 0} hrs ${approved_minutes || 0} Mins`
          : "-";
      },
    },
    {
      title: "Expected Productivity",
      render: (text) => {
        const expLevel = text.employee?.emp_exp_level
          ? text.employee?.emp_exp_level
          : "";
        let position =
          expLevel == "Fresher"
            ? "50%"
            : expLevel == "Junior"
            ? "75%"
            : expLevel == "Mid" || expLevel == "TL"
            ? "100%"
            : expLevel == "Senior"
            ? "140%"
            : "-";
        return (
          <div className="logged-by-wrapper">
            <span style={{ textTransform: "capitalize" }}>{position}</span>
          </div>
        );
      },
    },
    {
      title: "Achieved Productivity",
      render: (text) => {
        const { overallProductivity } = text.employee?.productivity
          ? text.employee?.productivity
          : "";

        return (
          <div className="logged-by-wrapper">
            <span style={{ textTransform: "capitalize" }}>
              {overallProductivity ? overallProductivity + "%" : "-"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Actions",
      render: (text, record, index) => {
        const { approved_hours, approved_minutes } = record.employee;
        return (
          <>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: "20px",
              }}
            >
              <div className="approved_hours-modal-button">
                <button
                  style={{
                    cursor:
                      approved_hours && approved_hours !== 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                  disabled={approved_hours && approved_hours !== 0}
                >
                  <i
                    class="fa-solid fa-circle-check"
                    onClick={() => {
                      setOpenApprovedHoursModal(true);
                      setEmployeeId(record?.employee.id);
                      setHours(record?.employee.total_hours);
                      setMinutes(record?.employee.total_minutes);
                    }}
                  ></i>
                </button>
              </div>

              <EyeOutlined
                onClick={() => {
                  const empId = record?.employee?.id;
                  if (empId) {
                    getEmpHoursDetails(empId);
                  }
                  setExpandedRowKey(null);
                  setopenLoggedTimeModal(true);
                }}
                style={{
                  cursor: "pointer",
                  fontSize: "20px",
                  background: "#4283FF",
                  color: "#fff",
                  padding: "3px",
                  borderRadius: "100px",
                }}
              />
            </div>
          </>
        );
      },
    },
  ];

  const USERColumns = [
    {
      title: "Employee Name",
      dataIndex: "employee",
      render: (text) => {
        return (
          <div className="logged-by-wrapper">
            <span style={{ textTransform: "capitalize" }}>
              {" "}
              {removeTitle(text.name)}
            </span>
          </div>
        );
      },
    },

    {
      title: "Tracked Hours",
      render: (record) => {
        const { total_hours, total_minutes } = record.employee;
        return total_hours || total_minutes
          ? `${total_hours || 0} hrs ${total_minutes || 0} Mins`
          : "-";
      },
    },
    {
      title: "Expected Hours",
      render: (record) => {
        return record?.employee?.productivity?.expectedHours
          ? `${record?.employee?.productivity?.expectedHours.toFixed(2)} Hrs`
          : "-";
      },
    },
    {
      title: "Approved Hours",
      render: (record) => {
        const { approved_hours, approved_minutes } = record.employee;
        return approved_hours || approved_minutes
          ? `${approved_hours || 0} hrs ${approved_minutes || 0} Mins`
          : "-";
      },
    },
    {
      title: "Notes",
      render: (record) => {
        const { notes } = record.employee;
        return notes && notes != "" ? notes : "-";
      },
    },
    {
      title: "Actions",
      render: (text, record, index) => {
        const { approved_hours, approved_minutes } = record.employee;
        return (
          <>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: "20px",
              }}
            >
              {!getRoles(["User"]) && (
                <div className="approved_hours-modal-button">
                  <button
                    style={{
                      cursor:
                        approved_hours && approved_hours !== 0
                          ? "not-allowed"
                          : "pointer",
                    }}
                    disabled={approved_hours && approved_hours !== 0}
                  >
                    <i
                      class="fa-solid fa-circle-check"
                      onClick={() => {
                        setOpenApprovedHoursModal(true);
                        setEmployeeId(record?.employee.id);
                        setHours(record?.employee.total_hours);
                        setMinutes(record?.employee.total_minutes);
                      }}
                    ></i>
                  </button>
                </div>
              )}
              <EyeOutlined
                onClick={() => {
                  const empId = record?.employee?.id;
                  if (empId) {
                    getEmpHoursDetails(empId);
                  }
                  setExpandedRowKey(null);
                  setopenLoggedTimeModal(true);
                }}
                style={{
                  cursor: "pointer",
                  fontSize: "20px",
                  background: "#4283FF",
                  color: "#fff",
                  padding: "3px",
                  borderRadius: "100px",
                }}
              />
            </div>
            {/* )} */}
          </>
        );
      },
    },
  ];

  const pcLoggedTimeColumns = [
    {
      title: "Logged By",
      key: "logged_by",
      render: (text, record) => {
        const { img, name } = record.employee;
        return (
          <div className="logged-by-wrapper">
            <span style={{ textTransform: "capitalize" }}>
              {" "}
              {removeTitle(name)}
            </span>
          </div>
        );
      },
    },
    {
      title: "Project",
      key: "project",
      render: (text, record) => {
        const taskText = record.project || ""; // Handle cases where task might be undefined or null
        const words = taskText.split("/");
        const displayedTask =
          words.length > 10 ? `${words.slice(0, 10).join(" ")}...` : taskText;
        return (
          <div className="billable-hours-project">
            <span style={{ textTransform: "capitalize" }}>
              {displayedTask ? displayedTask : "-"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Main Task",
      key: "main_task",
      render: (_, record) => {
        return (
          <div className="billable-hours-Main-Task">
            <span style={{ textTransform: "capitalize" }}>
              {record.main_task ? record.main_task : "-"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Task",
      key: "task",
      render: (_, record) => {
        const taskText = record.task || "";
        const words = taskText.split(" ");
        const displayedTask =
          words.length > 10 ? `${words.slice(0, 10).join(" ")}...` : taskText;

        return (
          <div className="billable-hours-task">
            <span style={{ textTransform: "capitalize" }}>
              {displayedTask ? displayedTask : "-"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Bug",
      key: "bug",
      render: (_, record) => {
        return (
          <div className="billable-hours-bugs">
            <span style={{ textTransform: "capitalize" }}>
              {record.bug ? record.bug : "-"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Date",
      key: "date",
      render: (text, record) => {
        const parsedDate = moment(record.logged_date, "DD-MM-YYYY");
        const formattedDate = parsedDate.format("DD MMM, YY");
        return (
          <div className="billable-hours-aproved-date">
            <span style={{ textTransform: "capitalize" }}>{formattedDate}</span>
          </div>
        );
      },
    },
    {
      title: "Logged Hours",
      key: "logged_hours",
      render: (text, record) => {
        return (
          <div className="billable-hours-loged-hours">
            <span style={{ textTransform: "capitalize" }}>
              {record.logged_hours}h {record.logged_minutes}m
            </span>
          </div>
        );
      },
    },
  ];

  const columns = [
    {
      title: "Employee Name",
      dataIndex: "employee",
      render: (text) => {
        return (
          <div className="logged-by-wrapper">
            <span style={{ textTransform: "capitalize" }}>
              {" "}
              {removeTitle(text.name)}
            </span>
          </div>
        );
      },
    },
    ...(selectedEmployeeRole != "my_emp"
      ? [
          {
            title: "Reporting Manager",
            render: (text) => {
              const { rm_full_name } = text.employee;
              return (
                <div className="logged-by-wrapper">
                  <span style={{ textTransform: "capitalize" }}>
                    {" "}
                    {removeTitle(rm_full_name)}
                  </span>
                </div>
              );
            },
          },
        ]
      : []),
    {
      title: "Experience Level",

      render: (text) => {
        const { emp_exp_level } = text.employee;
        let emp_experience = "";
        if (emp_exp_level == "Junior") {
          emp_experience = "1-3";
        } else if (emp_exp_level == "Fresher") {
          emp_experience = "0-1";
        } else if (emp_exp_level == "Mid") {
          emp_experience = "3-5";
        } else if (emp_exp_level == "Senior") {
          emp_experience = "5+";
        }

        return (
          <div className="logged-by-wrapper">
            <span style={{ textTransform: "capitalize" }}>
              {emp_exp_level ? emp_exp_level : "-"}
              {emp_experience && ` (${emp_experience})`}
            </span>
          </div>
        );
      },
    },
    {
      title: "Department",
      render: (text) => (text ? text.department : "-"),
    },
    {
      title: "Sub-Department",
      render: (text) => (text ? text.subdepartment : "-"),
    },
    {
      title: "Tracked Hours",
      render: (record) => {
        const { total_hours, total_minutes } = record.employee;
        return total_hours || total_minutes
          ? `${total_hours || 0} hrs ${total_minutes || 0} Mins`
          : "-";
      },
    },
    {
      title: "Expected Hours",
      render: (record) => {
        return record?.employee?.productivity?.expectedHours
          ? `${record?.employee?.productivity?.expectedHours.toFixed(2)} Hrs`
          : "-";
      },
    },
    {
      title: "Approved Hours",
      render: (record) => {
        const { approved_hours, approved_minutes } = record.employee;
        return approved_hours || approved_minutes
          ? `${approved_hours || 0} hrs ${approved_minutes || 0} Mins`
          : "-";
      },
    },
    {
      title: "Expected Productivity",
      render: (text) => {
        const expLevel = text.employee?.emp_exp_level
          ? text.employee?.emp_exp_level
          : "";
        let position =
          expLevel == "Fresher"
            ? "50%"
            : expLevel == "Junior"
            ? "75%"
            : expLevel == "Mid" || expLevel == "TL"
            ? "100%"
            : expLevel == "Senior"
            ? "140%"
            : "-";
        return (
          <div className="logged-by-wrapper">
            <span style={{ textTransform: "capitalize" }}>{position}</span>
          </div>
        );
      },
    },
    {
      title: "Achieved Productivity",
      render: (text) => {
        const { overallProductivity } = text.employee?.productivity
          ? text.employee?.productivity
          : "";
        return (
          <div
            className={`logged-by-wrapper ${
              text?.employee?.productivity_status == "low"
                ? "achived-productivity"
                : ""
            }`}
          >
            <span
              style={{
                textTransform: "capitalize",
                color:
                  text.employee?.productivity_status == "low" ? "#fff" : "",
                background:
                  text.employee?.productivity_status == "low" ? "red" : "",
              }}
            >
              {overallProductivity ? overallProductivity + "%" : "-"}
            </span>
          </div>
        );
      },
    },

    {
      title: "Actions",
      render: (_, record) => {
        const { approved_hours, approved_minutes } = record.employee;
        console.log(
          selectedEmployeeRole === "my_emp",
          getRoles(["User"]),
          "dhruviii"
        );

        return (
          <>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: "20px",
              }}
            >
              {(selectedEmployeeRole === "my_emp" || !getRoles(["User"])) && (
                <div className="approved_hours-modal-button">
                  <button
                    style={{
                      cursor:
                        approved_hours && approved_hours !== 0
                          ? "not-allowed"
                          : "pointer",
                    }}
                    disabled={approved_hours && approved_hours !== 0}
                  >
                    <i
                      class="fa-solid fa-circle-check"
                      onClick={() => {
                        setOpenApprovedHoursModal(true);
                        setEmployeeId(record?.employee.id);
                        setHours(record?.employee.total_hours);
                        setMinutes(record?.employee.total_minutes);
                      }}
                    ></i>
                  </button>
                </div>
              )}

              <EyeOutlined
                onClick={() => {
                  const empId = record?.employee?.id;
                  if (empId) {
                    getEmpHoursDetails(empId);
                  }
                  setExpandedRowKey(null);
                  setopenLoggedTimeModal(true);
                }}
                style={{
                  cursor: "pointer",
                  fontSize: "20px",
                  background: "#4283FF",
                  color: "#fff",
                  padding: "3px",
                  borderRadius: "100px",
                }}
              />
            </div>
          </>
        );
      },
    },
  ];

  const loggedTimeColumns = [
    {
      title: "Logged By",
      key: "logged_by",
      render: (_, record) => {
        const { name } = record.employee;
        return (
          <div className="logged-by-wrapper">
            <span style={{ textTransform: "capitalize" }}>
              {" "}
              {removeTitle(name)}
            </span>
          </div>
        );
      },
    },
    {
      title: "Project",
      key: "project",
      render: (text, record) => {
        return (
          <div className="billable-hours-project">
            <span style={{ textTransform: "capitalize" }}>
              {record.project ? record.project : "-"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Main Task",
      key: "main_task",
      render: (text, record) => {
        return (
          <div className="billable-hours-Main-Task">
            <span style={{ textTransform: "capitalize" }}>
              {record.main_task ? record.main_task : "-"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Task",
      key: "task",
      render: (_, record) => {
        const taskText = record.task || "";
        const words = taskText.split(" ");
        const displayedTask =
          words.length > 10 ? `${words.slice(0, 10).join(" ")}...` : taskText;

        return (
          <div className="billable-hours-task">
            <span style={{ textTransform: "capitalize" }}>
              {displayedTask ? displayedTask : "-"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Bug",
      key: "bug",
      render: (text, record) => {
        return (
          <div className="billable-hours-bugs">
            <span style={{ textTransform: "capitalize" }}>
              {record.bug ? record.bug : "-"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Date",
      key: "date",
      render: (text, record) => {
        const parsedDate = moment(record.logged_date, "DD-MM-YYYY");
        const formattedDate = parsedDate.format("DD MMM, YY");
        return (
          <div className="billable-hours-aproved-date">
            <span style={{ textTransform: "capitalize" }}>{formattedDate}</span>
          </div>
        );
      },
    },
    {
      title: "Logged Hours",
      key: "logged_hours",
      render: (text, record) => {
        return (
          <div className="billable-hours-loged-hours">
            <span style={{ textTransform: "capitalize" }}>
              {record.logged_hours}h {record.logged_minutes}m
            </span>
          </div>
        );
      },
    },
  ];

  const currentDate = new Date();
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const currentYear = currentDate.getFullYear().toString();

  // get billable hours for PC
  const approvedHoursApi = async () => {
    if (!approvedHours) {
      setError("Hours are required");
      return;
    }

    const reqBody = {
      employee_id: employeeId,
      month: selectedMonth ? selectedMonth : currentMonth,
      year: selectedYear ? selectedYear : currentYear,
      hours: hours?.toString(),
      approved_hours: approvedHours,
      notes: notes,
      approved_minutes: approvedMinutes ? approvedMinutes : "00",
      minutes: minutes ? minutes.toString() : "00",
    };

    dispatch(showAuthLoader());
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.addApprovedBillableHours}`,
        body: reqBody,
      });
      if (response?.data && response?.data?.statusCode == 201) {
        dispatch(hideAuthLoader());
        setOpenApprovedHoursModal(false);
        setApprovedMinutes("");
        setApprovedHours("");
        setNotes("");
        message.success(response.data.message);

        getBillableoursOfPC();
      } else {
        dispatch(hideAuthLoader());
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  const getEmpHoursDetails = async (employeedId) => {
    const reqBody = {
      month: selectedMonth ? selectedMonth : currentMonth,
      year: selectedYear ? selectedYear : currentYear,
      emp_id: employeedId,
    };

    dispatch(showAuthLoader());
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.empHoursDetails}`,
        body: reqBody,
      });
      if (response?.data && response?.data?.status) {
        dispatch(hideAuthLoader());
        const dataWithKeys = response?.data?.data.map((item, index) => ({
          ...item,
          key: index.toString(),
        }));
        setSelectedEmployeeLogs(dataWithKeys);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  // get billable hours for PC
  const getBillableoursOfPC = async () => {
    let empRole = tempEmployeeRole == "my_emp" || !getRoles(["Admin"]);
    const reqBody = {
      month: selectedMonth ? selectedMonth : currentMonth,
      year: selectedYear ? selectedYear : currentYear,
      users: assignees ? assignees : <></>,
      dept_ids: subDepartmentList ? subDepartmentList : <></>,
      pageNo: pagination.current,
      limit: pagination.pageSize,
      productivity_status: selectedProductivity ? selectedProductivity : "",
      my_emps: empRole,
    };
    if (getRoles(["User"])) {
      reqBody.users = [authUser?._id];
    }

    dispatch(showAuthLoader());
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.getBillableHoursForPC}`,
        body: reqBody,
      });
      if (response?.data && response?.data?.status) {
        dispatch(hideAuthLoader());
        setBillableHoursOfPC(response.data.data);
        setGrandTotalHours(response.data.metadata.totalData.grandTotal);
        setGrandApprovedTotalHours(
          response.data.metadata.totalData.grandApprovedTotal
        );
        setPagination({
          ...pagination,
          total: response.data.metadata.total,
        });
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.log(error);
    }
  };

  // get employees list
  const getEmployeesList = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        ...values,
      };
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getEmployees,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setEmployeesList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get employees list
  const getEmployeesListRoleWise = async (values) => {
    try {
      dispatch(showAuthLoader());
      const reqBody = {
        ...values,
      };
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.empMgrWise,
        body: reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data && response?.data?.data) {
        setEmployeesList(response?.data?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // get department list
  const getDepartmentList = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getsubDepartmentList,
      });

      if (response?.data && response?.data?.data) {
        setDepartmentList(response.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="ant-project-task  all-project-main-wrapper billable-hours">
      <Card>
        <div className="profile-sub-head">
          <div className="head-box-inner">
            <div className="heading-main">
              <h2>Billable Hours</h2>
            </div>
          </div>
          <div className="status-content">
            {getRoles(["Admin"]) && (
              <div style={{ cursor: "pointer" }}>
                <h6>Search Employee by Role</h6>
                <Popover
                  trigger="click"
                  visible={popOver.byRole}
                  onVisibleChange={() => handleVisibleChange("byRole", true)}
                  placement="bottomRight"
                  content={
                    <div className="assignees-popover assign-global-height all-checkbox billableHours">
                      <ul>
                        <li>
                          <Radio
                            checked={tempEmployeeRole === ""}
                            onChange={() => handleRoleChnage("")}
                          >
                            {" "}
                            All Employees
                          </Radio>
                        </li>
                        <li>
                          <Radio
                            checked={tempEmployeeRole === "my_emp"}
                            onChange={() => handleRoleChnage("my_emp")}
                          >
                            {" "}
                            My Employees
                          </Radio>
                        </li>
                      </ul>

                      <div className="productivity-popover-footer-btnss">
                        <Button
                          type="primary"
                          className="square-primary-btn ant-btn-primary"
                          onClick={() => {
                            getBillableoursOfPC();
                            if (
                              tempEmployeeRole &&
                              tempEmployeeRole == "my_emp"
                            ) {
                              getEmployeesListRoleWise();
                            } else {
                              getEmployeesList();
                            }
                            handleApplyRoleChange();
                            handleVisibleChange("byRole", false);
                            setPagination({
                              current: 1,
                              pageSize: 10,
                            });
                          }}
                        >
                          Apply
                        </Button>
                        <Button
                          className="square-outline-btn ant-delete"
                          onClick={() => {
                            handleVisibleChange("byRole", false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <i className="fi fi-rr-users"></i>{" "}
                  {selectedEmployeeRole == "" ? "All Employee" : "My Employee"}
                </Popover>
              </div>
            )}

            {getRoles(["Admin"]) && (
              <div
                className="search-department-billable-hours"
                style={{ cursor: "pointer" }}
              >
                <h6>Search Department</h6>
                <Popover
                  trigger="click"
                  visible={popOver.department}
                  onVisibleChange={() =>
                    handleVisibleChange("department", true)
                  }
                  placement="bottomRight"
                  content={
                    <div className="assignees-popover assign-global-height all-checkbox billableHours">
                      <ul>
                        <li>
                          <Checkbox
                            checked={subDepartmentList.length === 0}
                            onChange={() => setSubDepartmentList([])}
                          >
                            {" "}
                            All
                          </Checkbox>
                        </li>
                      </ul>
                      <div className="search-filter">
                        <Input
                          placeholder="Search"
                          value={searchDepartment}
                          onChange={handleSearchDepartment}
                        />
                      </div>
                      <ul className="assigness-data">
                        {filteredDepartment.map((item) => (
                          <li key={item._id}>
                            <Checkbox
                              onChange={() => handleDepartmentFilters(item)}
                              checked={subDepartmentList.includes(item._id)}
                            >
                              {item.sub_department_name}
                            </Checkbox>
                          </li>
                        ))}
                      </ul>
                      <div className="popover-footer-btn">
                        <Button
                          type="primary"
                          className="square-primary-btn ant-btn-primary"
                          onClick={() => {
                            getBillableoursOfPC();
                            handleVisibleChange("department", false);
                            setPagination({
                              current: 1,
                              pageSize: 10,
                            });
                          }}
                        >
                          Apply
                        </Button>
                        <Button
                          className="square-outline-btn ant-delete"
                          onClick={() => {
                            setSubDepartmentList([]);
                            handleVisibleChange("department", false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <i className="fas fa-briefcase"></i>
                  {subDepartmentList.length == 0 ? "All" : "Selected"}
                </Popover>
              </div>
            )}
            {!getRoles(["User"]) && (
              <div style={{ cursor: "pointer" }}>
                <h6>Search by employee</h6>
                <Popover
                  trigger="click"
                  visible={popOver.assignees}
                  onVisibleChange={() => handleVisibleChange("assignees", true)}
                  placement="bottomRight"
                  content={
                    <div className="assignees-popover assign-global-height all-checkbox billableHours">
                      <ul>
                        <li>
                          <Checkbox
                            checked={assignees.length === 0}
                            onChange={() => setAssignees([])}
                          >
                            {" "}
                            All
                          </Checkbox>
                        </li>
                      </ul>
                      <div className="search-filter">
                        <Input
                          placeholder="Search"
                          value={searchAssignees}
                          onChange={handleSearchTermAssignees}
                        />
                      </div>
                      <ul className="assigness-data">
                        {filteredEmployees.map((item) => (
                          <li key={item._id}>
                            <Checkbox
                              onChange={() => handleFilters(item)}
                              checked={assignees.includes(item._id)}
                            >
                              <span className="billablehoursE-name">
                                {removeTitle(item.full_name)}
                              </span>
                            </Checkbox>
                          </li>
                        ))}
                      </ul>
                      <div className="popover-footer-btn">
                        <Button
                          type="primary"
                          className="square-primary-btn ant-btn-primary"
                          onClick={() => {
                            getBillableoursOfPC();
                            handleVisibleChange("assignees", false);
                            setPagination({
                              current: 1,
                              pageSize: 10,
                            });
                          }}
                        >
                          Apply
                        </Button>
                        <Button
                          className="square-outline-btn ant-delete"
                          onClick={() => {
                            setAssignees([]);
                            handleVisibleChange("assignees", false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <i className="fi fi-rr-users"></i>{" "}
                  {assignees.length == 0 ? "All" : "Selected"}
                </Popover>
              </div>
            )}
            <div style={{ cursor: "pointer" }}>
              <h6>Select Month</h6>
              <Popover
                placement="bottomRight"
                trigger="click"
                content={
                  <div className="month-picker-billable-hours">
                    <DatePicker
                      defaultValue={dayjs()}
                      onChange={onMonthChange}
                      picker="month"
                      disabledDate={(current) => {
                        return current && current < dayjs("2024-10-01");
                      }}
                    />
                    <div className="popover-footer-btn">
                      <Button
                        type="primary"
                        className="square-primary-btn ant-btn-primary"
                        onClick={() => {
                          if (selectedMonth && selectedYear) {
                            getBillableoursOfPC();
                            setPagination({
                              current: 1,
                              pageSize: 10,
                            });
                            handleVisibleChange("month", false);
                          } else {
                            message.warning("Please select a month and year.");
                            handleVisibleChange("month", false);
                          }
                        }}
                      >
                        Apply
                      </Button>
                      <Button
                        className="square-outline-btn ant-delete"
                        onClick={() => handleVisibleChange("month", false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                }
                visible={popOver.month}
                onVisibleChange={() => handleVisibleChange("month", true)}
              >
                <span>
                  <i className="fi fi-rr-calendar-minus"></i>
                  {selectedMonth && selectedYear ? (
                    <span style={{ marginLeft: "8px" }}>
                      {moment(selectedMonth).format("MMM")}{" "}
                      {moment(selectedYear).format("YY")}
                    </span>
                  ) : (
                    <span style={{ marginLeft: "8px" }}>
                      {moment(currentMonth).format("MMM")}{" "}
                      {moment(currentYear).format("YY")}
                    </span>
                  )}
                </span>
              </Popover>
            </div>
          </div>
        </div>

        {!getRoles(["User"]) && (
          <table className="tracked-hours-wrapper">
            <thead>
              <tr>
                <th>
                  <div className="total-trackedBillable-hours">
                    Total Tracked Hours
                  </div>
                </th>
                <th>
                  <div className="total-approvedBillable-hours">
                    Total Approved Hours
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <p>
                    {grandTotalHours?.hours || grandTotalHours?.minutes
                      ? `${grandTotalHours.hours || 0} hrs ${
                          grandTotalHours.minutes || 0
                        } Mins`
                      : "-"}
                  </p>
                </td>
                <td>
                  <p>
                    {grandApprovedTotalHours?.hours ||
                    grandApprovedTotalHours?.minutes
                      ? `${grandApprovedTotalHours.hours || 0} hrs ${
                          grandApprovedTotalHours.minutes || 0
                        } Mins`
                      : "-"}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        )}

        <Table
          className="time-block-table"
          columns={
            getRoles(["Admin"])
              ? columns
              : getRoles(["User"])
              ? USERColumns
              : PCColumns
          }
          dataSource={billableHoursOfPC}
          pagination={
            !getRoles(["User"]) && {
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "30"],
              showTotal: showTotal,
              ...pagination,
            }
          }
          onChange={handleTableChange}
        />
      </Card>
      <Modal
        className="billable-hours-logged-hours-details"
        open={openLoggedTimeModal}
        footer={null}
        width={1200}
        onCancel={onCancel}
        zIndex={2000}
      >
        <div className="modal-header ">
          <h1>Logged Time detail</h1>
        </div>

        <div className="modal-body loggedtimedetails-wrapper">
          <Table
            columns={
              getRoles(["Admin"])
                ? loggedTimeColumns
                : pcLoggedTimeColumns
            }
            dataSource={selectedEmployeeLogs}
            pagination={false}
            expandable={{
              expandedRowRender: (record) => (
                <div className="loggedtimedetails" style={{ margin: 0 }}>
                  {record?.descriptions ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: record?.descriptions,
                      }}
                    ></div>
                  ) : (
                    <div style={{ color: "grey" }}>No description added</div>
                  )}
                </div>
              ),
              onExpand: (expanded, record) => {
                setExpandedRowKey(expanded ? record.key : null);
              },
              expandedRowKeys: expandedRowKey ? [expandedRowKey] : [],
            }}
          />
        </div>
      </Modal>
      <Modal
        className="billable-hours-pc-approved-hours-modal"
        open={openApprovedHoursModal}
        footer={null}
        width={600}
        onCancel={onModalClose}
        zIndex={2000}
      >
        <div className="modal-header">
          <h1>Approve Hours</h1>
        </div>

        <div className="modal-body loggedtimedetails-wrapper">
          <div className="field-wrapper">
            <label>Add Hours:</label>
            <Input
              placeholder="Enter hours"
              type="text"
              value={approvedHours}
              onChange={handleApprovedHoursChange}
            />
            {error && <span style={{ color: "red" }}>{error}</span>}{" "}
          </div>
          <div className="field-wrapper">
            <label>Add Minutes:</label>
            <Input
              placeholder="Enter Minutes"
              type="text"
              value={approvedMinutes}
              onChange={handleApprovedMinutesChange}
            />
            {minuteError && <span style={{ color: "red" }}>{minuteError}</span>}{" "}
          </div>
          <div className="field-wrapper">
            <label>Add Notes:</label>
            <Input.TextArea
              placeholder="Enter notes"
              rows={4}
              value={notes}
              onChange={handleNotesChange}
            />
          </div>
        </div>

        <div className="modal-footer">
          <Button
            type="primary"
            style={{ marginLeft: 8 }}
            onClick={approvedHoursApi}
          >
            Approve
          </Button>
          <Button onClick={onModalClose} className="ant-delete">
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default SuperAdminBillableHours;
