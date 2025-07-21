import React, { useState, useEffect } from "react";
import { Card, Spin, Row, Col } from "antd";
import Service from "../../service";
import AdminPeople from "../../assets/icons/AdminPeople";
import EmployeeIcon from "../../assets/icons/EmployeeIcon";
import { useHistory } from "react-router-dom";

const AdminDashboard = () => {
  const history = useHistory();
  const userData = JSON.parse(localStorage.getItem("user_data"));
  const roleName = userData.pms_role_id.role_name;

  const [dashboardData, setDashboardData] = useState({
    totalAdmin: 0,
    totalEmployee: 0,
  });

  const getDashboardData = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getDashboardData
      });

      if (response.data.status == 1) {
        setDashboardData({
          totalAdmin: response.data.data.totalAdmins || 0,
          totalEmployee: response.data.data.totalEmployees || 0,
        });
      }
    } catch (error) {
      console.log("Error getting unread thread count:", error);
    }
  };

  useEffect(() => {
    getDashboardData();
  }, []);

  const dashboardCards = [
    ...(roleName === "Super Admin"
      ? [
          {
            title: "Total Admin",
            value: dashboardData.totalAdmin,
            icon: <AdminPeople />,
            iconBgColor: "rgba(82, 196, 26, 0.1)",
            navigateTo: "/admin/Administrator",
          },
        ]
      : []),
    {
      title: "Total Employee",
      value: dashboardData.totalEmployee,
      icon: <EmployeeIcon />,
      iconBgColor: "rgba(24, 144, 255, 0.1)",
      navigateTo: "/admin/company-employee"
    },
  ];
  
  return (
    <div
      style={{
        padding: "24px",
      }}
    >
        <Row gutter={[24, 24]} justify="start">
          {dashboardCards.map((card, index) => (
            <Col xs={24} sm={12} md={12} lg={8} xl={6} key={index}>
              <Card
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                  boxShadow:
                    "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
                  minHeight: "100px",
                  cursor: card.navigateTo ? "pointer" : "default",
                }}
                bodyStyle={{
                  padding: "20px 24px",
                }}
                onClick={() => card.navigateTo && history.push(card.navigateTo)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      backgroundColor: card.iconBgColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#595959",
                        marginBottom: "4px",
                        fontWeight: "400",
                        lineHeight: "1.4",
                      }}
                    >
                      {card.title}
                    </div>
                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: "600",
                        color: "#262626",
                        lineHeight: "1.2",
                      }}
                    >
                      {card.value}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
    </div>
  );
};

export default AdminDashboard;
