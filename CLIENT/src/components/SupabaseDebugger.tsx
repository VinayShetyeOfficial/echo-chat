import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const SupabaseDebugger = () => {
  const [status, setStatus] = useState<{
    connected: boolean;
    tables: string[];
    activeChannels: string[];
    realtimeEnabled: boolean;
  }>({
    connected: false,
    tables: [],
    activeChannels: [],
    realtimeEnabled: false,
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Test connection
        const { data, error } = await supabase
          .from("Message")
          .select("id")
          .limit(1);

        // Get schema information
        const { data: schemaData } = await supabase.rpc(
          "get_schema_information"
        );

        // Get active channels
        const channels = supabase.getChannels();

        setStatus({
          connected: !error,
          tables: schemaData?.tables || [],
          activeChannels: channels.map((c) => c.topic),
          realtimeEnabled: true, // If we could get this info we would
        });
      } catch (err) {
        console.error(err);
        setStatus((s) => ({ ...s, connected: false }));
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="p-4 border rounded-md bg-gray-50 text-sm">
      <h3 className="font-medium mb-2">Supabase Status</h3>
      <div className="space-y-1">
        <div className="flex items-center">
          <span
            className={`w-2 h-2 rounded-full mr-2 ${
              status.connected ? "bg-green-500" : "bg-red-500"
            }`}
          ></span>
          Connection: {status.connected ? "Connected" : "Disconnected"}
        </div>
        <div>Realtime: {status.realtimeEnabled ? "Enabled" : "Disabled"}</div>
        <div>Active Channels: {status.activeChannels.length}</div>
        <div className="text-xs text-gray-500">
          {status.activeChannels.join(", ")}
        </div>
      </div>
    </div>
  );
};
