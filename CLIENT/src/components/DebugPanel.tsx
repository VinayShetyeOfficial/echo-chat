import { useState, createContext, useContext, useRef } from "react";
import { X } from "lucide-react";

interface LogItem {
  type: "success" | "error" | "info";
  message: string;
  data?: any;
  timestamp: Date;
}

export const useDebugLogger = () => {
  const [logs, setLogs] = useState<LogItem[]>([]);

  // Add a ref to track previously logged messages to prevent duplicates
  const prevLogsRef = useRef<{ [key: string]: number }>({});

  const log = {
    success: (message: string, data?: any) => {
      const key = `${message}-${JSON.stringify(data || {})}`;
      const now = Date.now();

      // Only log if it's been at least 1 second since we logged the same message
      if (!prevLogsRef.current[key] || now - prevLogsRef.current[key] > 1000) {
        prevLogsRef.current[key] = now;
        setLogs((prev) => [
          { type: "success", message, data, timestamp: new Date() },
          ...prev.slice(0, 99),
        ]);
      }
    },
    error: (message: string, data?: any) => {
      setLogs((prev) => [
        { type: "error", message, data, timestamp: new Date() },
        ...prev,
      ]);
    },
    info: (message: string, data?: any) => {
      setLogs((prev) => [
        { type: "info", message, data, timestamp: new Date() },
        ...prev,
      ]);
    },
    clear: () => setLogs([]),
  };

  return { logs, log };
};

// Create a context to access logs throughout the app
export const DebugContext = createContext<
  ReturnType<typeof useDebugLogger> | undefined
>(undefined);

export const DebugPanel = () => {
  const { logs, log } = useContext(DebugContext)!;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-purple-600 text-white px-3 py-1 rounded-md"
      >
        Debug {logs.length > 0 && `(${logs.length})`}
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 w-96 max-h-96 overflow-auto bg-black/90 text-white rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <h3>Debug Logs</h3>
            <div>
              <button onClick={log.clear} className="text-xs mr-2">
                Clear
              </button>
              <button onClick={() => setIsOpen(false)}>
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`p-2 rounded text-sm ${
                  log.type === "success"
                    ? "bg-green-900/50"
                    : log.type === "error"
                    ? "bg-red-900/50"
                    : "bg-blue-900/50"
                }`}
              >
                <div className="flex justify-between">
                  <span>{log.message}</span>
                  <span className="text-xs opacity-50">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                {log.data && (
                  <pre className="text-xs mt-1 overflow-x-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
