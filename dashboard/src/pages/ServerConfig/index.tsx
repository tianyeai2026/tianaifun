import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Button, Card, Space, Typography, Tag, Divider, message } from "antd";
import { Server, Wifi, WifiOff, Clock, Trash2, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  getServerBaseUrl,
  setServerBaseUrl,
  getServerHistory,
  removeServerFromHistory,
  testServerConnection,
  normalizeServerUrl,
  type ServerRecord,
} from "../../api/serverConfig";
import { useTheme } from "../../context/ThemeContext";

const { Title, Text, Paragraph } = Typography;

/** 简单的中英文判断（不接入 i18n 系统，保持此页面独立） */
function useLocalized() {
  const lang =
    typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("zh")
      ? "zh"
      : "en";
  return useMemo(
    () => ({
      title: lang === "zh" ? "连接服务器" : "Connect to Server",
      subtitle:
        lang === "zh"
          ? "请输入你的 Octop 服务器地址"
          : "Enter your Octop server address",
      placeholder:
        lang === "zh"
          ? "例如：http://192.168.1.100:8088"
          : "e.g. http://192.168.1.100:8088",
      test: lang === "zh" ? "测试连接" : "Test Connection",
      testing: lang === "zh" ? "测试中..." : "Testing...",
      save: lang === "zh" ? "保存并继续" : "Save & Continue",
      history: lang === "zh" ? "最近使用" : "Recent",
      noHistory: lang === "zh" ? "暂无历史记录" : "No history yet",
      connected: lang === "zh" ? "连接成功" : "Connected",
      disconnected: lang === "zh" ? "无法连接" : "Unreachable",
      latency: (ms: number) => (lang === "zh" ? `${ms}ms` : `${ms}ms`),
      invalidUrl: lang === "zh" ? "请输入有效的服务器地址（以 http:// 或 https:// 开头）" : "Please enter a valid server address (starting with http:// or https://)",
      testSuccess: (ms: number) =>
        lang === "zh" ? `连接成功，延迟 ${ms}ms` : `Connected, latency ${ms}ms`,
      testFail: (err: string) => (lang === "zh" ? `连接失败：${err}` : `Connection failed: ${err}`),
      saveSuccess: lang === "zh" ? "服务器已保存" : "Server saved",
      hint:
        lang === "zh"
          ? "服务器运行在你的电脑或云主机上，手机需要能访问到该地址"
          : "The server runs on your computer or cloud host; your phone must be able to reach it",
    }),
    [lang],
  );
}

export default function ServerConfigPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const L = useLocalized();

  const [url, setUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);
  const [history, setHistory] = useState<ServerRecord[]>([]);

  useEffect(() => {
    // 加载当前配置和历史记录
    const current = getServerBaseUrl();
    if (current) setUrl(current);
    setHistory(getServerHistory());
  }, []);

  const handleTest = async () => {
    const normalized = normalizeServerUrl(url);
    if (!normalized) {
      message.error(L.invalidUrl);
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await testServerConnection(normalized);
    setTestResult(result);
    setTesting(false);
    if (result.ok && result.latencyMs != null) {
      message.success(L.testSuccess(result.latencyMs));
    } else {
      message.error(L.testFail(result.error || "unknown"));
    }
  };

  const handleSave = () => {
    const normalized = normalizeServerUrl(url);
    if (!normalized) {
      message.error(L.invalidUrl);
      return;
    }
    setServerBaseUrl(normalized);
    setHistory(getServerHistory());
    message.success(L.saveSuccess);
    // 跳转到登录页
    setTimeout(() => navigate("/login"), 300);
  };

  const handleHistoryClick = (record: ServerRecord) => {
    setUrl(record.url);
    setTestResult(null);
  };

  const handleHistoryRemove = (record: ServerRecord) => {
    removeServerFromHistory(record.url);
    setHistory(getServerHistory());
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: isDark ? "#0b0d14" : "#f5f5f7",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 16,
          boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.08)",
          background: isDark ? "#1a1c28" : "#ffffff",
        }}
        styles={{ body: { padding: "32px 24px" } }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Logo 和标题 */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "linear-gradient(135deg, #e85d75 0%, #f08b9a 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Server size={32} color="#fff" />
            </div>
            <Title level={3} style={{ margin: 0, color: isDark ? "#fff" : "#1a1a1a" }}>
              {L.title}
            </Title>
            <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              {L.subtitle}
            </Paragraph>
          </div>

          {/* 服务器地址输入 */}
          <div>
            <Input
              size="large"
              prefix={<Server size={18} style={{ color: "#888" }} />}
              placeholder={L.placeholder}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestResult(null);
              }}
              onPressEnter={handleTest}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>

          {/* 测试结果 */}
          {testResult && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: testResult.ok
                  ? isDark
                    ? "rgba(82,196,26,0.1)"
                    : "#f6ffed"
                  : isDark
                    ? "rgba(255,77,79,0.1)"
                    : "#fff2f0",
                border: `1px solid ${testResult.ok ? "#52c41a" : "#ff4d4f"}33`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {testResult.ok ? (
                <CheckCircle2 size={18} color="#52c41a" />
              ) : (
                <WifiOff size={18} color="#ff4d4f" />
              )}
              <Text style={{ color: testResult.ok ? "#52c41a" : "#ff4d4f", fontSize: 14 }}>
                {testResult.ok
                  ? `${L.connected} · ${testResult.latencyMs}ms`
                  : `${L.disconnected} · ${testResult.error}`}
              </Text>
            </div>
          )}

          {/* 操作按钮 */}
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Button
              size="large"
              block
              icon={testing ? <Wifi size={16} className="anticon-spin" /> : <Wifi size={16} />}
              onClick={handleTest}
              disabled={testing || !url.trim()}
            >
              {testing ? L.testing : L.test}
            </Button>
            <Button
              size="large"
              type="primary"
              block
              icon={<ArrowRight size={16} />}
              onClick={handleSave}
              disabled={!url.trim()}
              style={{
                background: "linear-gradient(135deg, #e85d75 0%, #f08b9a 100%)",
                border: "none",
                fontWeight: 600,
              }}
            >
              {L.save}
            </Button>
          </Space>

          {/* 提示 */}
          <Paragraph
            type="secondary"
            style={{ fontSize: 12, textAlign: "center", margin: 0, lineHeight: 1.6 }}
          >
            {L.hint}
          </Paragraph>

          {/* 历史记录 */}
          {history.length > 0 && (
            <>
              <Divider style={{ margin: "8px 0" }}>
                <Tag icon={<Clock size={12} />} color="default">
                  {L.history}
                </Tag>
              </Divider>
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                {history.map((record) => (
                  <div
                    key={record.url}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: isDark ? "rgba(255,255,255,0.04)" : "#f5f5f5",
                      cursor: "pointer",
                    }}
                    onClick={() => handleHistoryClick(record)}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: isDark ? "rgba(255,255,255,0.85)" : "#333",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {record.url}
                    </Text>
                    <Button
                      type="text"
                      size="small"
                      icon={<Trash2 size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHistoryRemove(record);
                      }}
                      style={{ color: "#999" }}
                    />
                  </div>
                ))}
              </Space>
            </>
          )}
        </Space>
      </Card>
    </div>
  );
}
