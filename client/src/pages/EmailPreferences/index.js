import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Collapse, Input, Spin, Switch, Table, message } from "antd";
import Service from "../../service";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import "./EmailPreferences.css";

// Same layout as WeekMate HRMS → Email Preferences: one panel per module,
// a switch per email, per module and for all emails.
const EmailPreferences = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [expandedModule, setExpandedModule] = useState(null);

  const getSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getMyEmailPreferences,
      });
      if (response?.data?.status) {
        setSettings(response.data.data || []);
      } else {
        message.error(response?.data?.message || "Error fetching email preferences");
      }
    } catch (error) {
      message.error("Error fetching email preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getSettings();
  }, [getSettings]);

  const saveChanges = async (changes) => {
    if (changes.length === 0) return;
    const enabledById = new Map(changes.map((change) => [change.settingId, change.enabled]));
    const previous = settings;
    // update the switches straight away, roll back if the save fails
    setSettings((prev) =>
      prev.map((setting) =>
        enabledById.has(setting.settingId) ? { ...setting, enabled: enabledById.get(setting.settingId) } : setting
      )
    );
    try {
      setSaving(true);
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.updateMyEmailPreferences,
        body: { changes },
      });
      if (response?.data?.status) {
        message.success(response.data.message || "Email preferences updated");
      } else {
        setSettings(previous);
        message.error(response?.data?.message || "Error updating email preferences");
      }
    } catch (error) {
      setSettings(previous);
      message.error("Error updating email preferences");
    } finally {
      setSaving(false);
    }
  };

  const searchLower = searchText.trim().toLowerCase();
  const visibleSettings = useMemo(
    () =>
      searchLower
        ? settings.filter((setting) => `${setting.name} ${setting.module}`.toLowerCase().includes(searchLower))
        : settings,
    [settings, searchLower]
  );

  // modules keep the server's order (Projects, Task Lists, Tasks, ...)
  const settingsByModule = useMemo(
    () =>
      visibleSettings.reduce((groups, setting) => {
        const module = setting.module || "Other";
        (groups[module] = groups[module] || []).push(setting);
        return groups;
      }, {}),
    [visibleSettings]
  );
  const moduleNames = Object.keys(settingsByModule);

  const changesTo = (list, enabled) =>
    list.filter((setting) => setting.enabled !== enabled).map((setting) => ({ settingId: setting.settingId, enabled }));

  const isAllEnabled = visibleSettings.length > 0 && visibleSettings.every((setting) => setting.enabled);

  const columns = [
    {
      title: "Email Name",
      dataIndex: "name",
      key: "name",
      render: (name) => <span className="ep-email-name">{name}</span>,
    },
    {
      title: "Receive Email",
      dataIndex: "enabled",
      key: "enabled",
      align: "center",
      width: 200,
      render: (enabled, record) => (
        <Switch
          checked={enabled}
          disabled={saving}
          onChange={(checked) => saveChanges([{ settingId: record.settingId, enabled: checked }])}
        />
      ),
    },
  ];

  return (
    <div className="email-preferences-page">
      <div className="inout-header text-left">
        <h2>Email Preferences</h2>
      </div>

      <div className="ep-card">
        <div className="ep-toolbar">
          <Input.Search
            placeholder="Search..."
            allowClear
            onSearch={(value) => setSearchText(value)}
            onChange={(e) => !e.target.value && setSearchText("")}
            className="ep-search"
          />
          <div className="ep-toolbar-actions">
            <span className="ep-all-toggle">
              <Switch
                checked={isAllEnabled}
                disabled={visibleSettings.length === 0 || saving}
                onChange={(checked) => saveChanges(changesTo(visibleSettings, checked))}
              />
              All Emails
            </span>
            <Button className="ep-collapse-btn" onClick={() => setExpandedModule(null)} disabled={!expandedModule}>
              Collapse
            </Button>
          </div>
        </div>

        <Alert
          type="info"
          showIcon
          className="ep-info"
          message="Turn off the emails you don't want to receive. Emails not listed here are always sent."
        />

        <Spin spinning={loading}>
          {moduleNames.length > 0 ? (
            <Collapse
              accordion
              activeKey={expandedModule}
              onChange={(key) => setExpandedModule((Array.isArray(key) ? key[0] : key) || null)}
              className="ep-collapse"
              items={moduleNames.map((module) => {
                const list = settingsByModule[module];
                return {
                  key: module,
                  label: (
                    <div className="ep-module-header">
                      <span className="ep-module-title">
                        {module} ({list.length})
                      </span>
                      <span onClick={(event) => event.stopPropagation()}>
                        <Switch
                          checked={list.some((setting) => setting.enabled)}
                          disabled={saving}
                          onChange={(checked) => saveChanges(changesTo(list, checked))}
                        />
                      </span>
                    </div>
                  ),
                  children: (
                    <Table
                      columns={columns}
                      dataSource={list}
                      rowKey="settingId"
                      pagination={false}
                      size="middle"
                      className="ep-table"
                    />
                  ),
                };
              })}
            />
          ) : (
            !loading && (
              <div className="ep-empty">
                <NoDataFoundIcon />
              </div>
            )
          )}
        </Spin>
      </div>
    </div>
  );
};

export default EmailPreferences;
