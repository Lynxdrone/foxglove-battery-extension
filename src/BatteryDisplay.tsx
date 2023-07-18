import { Immutable, MessageEvent, PanelExtensionContext, Topic, SettingsTreeAction } from "@foxglove/studio";
import { useEffect, useLayoutEffect, useState, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import { set } from "lodash";

import BatteryLevelIndicator from './components/BatteryLevelIndicator';


type BatteryState = {
  voltage: number;
  temperature: number;
  current: number;
  charge: number;
  capacity: number;
  design_capacity: number;
  percentage: number;
  power_supply_status: number;
  power_supply_health: number;
  power_supply_technology: number;
  present: boolean;
  cell_voltage: number[];
  cell_temperature: number[];
  location: string;
  serial_number: string;
}

type Config = {
  batteryTopic?: string
};


function BatteryDisplay({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<undefined | Immutable<Topic[]>>();
  const [messages, setMessages] = useState<undefined | Immutable<MessageEvent[]>>();
  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  const [batteryMessage, setbatteryMessage] = useState<BatteryState | undefined>();

  // Init config variable
  const [config, setConfig] = useState<Config>(() => {
    const partialConfig = context.initialState as Config;

    const {
      batteryTopic = "",
    } = partialConfig;

    return { batteryTopic };
  });

  // Topic types memo (filter topics by type)
  const batteryTopics = useMemo(
    () => (topics ?? []).filter((topic) => topic.schemaName === "sensor_msgs/BatteryState"),
    [topics],
  );

  const actionHandler = useCallback(
    (action: SettingsTreeAction) => {
      if (action.action === "update") {
        const { path, value } = action.payload;

        // Update config based on the previous config
        setConfig((previous) => {
          const newConfig = { ...previous };
          set(newConfig, path.slice(1), value);
          return newConfig;
        });
      }
    },
    [context],
  );

  // update setting editor when config or topics change
  useEffect(() => {
    context.saveState(config);
    const batteryTopicOptions = (batteryTopics ?? []).map((topic) => ({ value: topic.name, label: topic.name }));

    context.updatePanelSettingsEditor({
      actionHandler,
      nodes: {
        general: {
          label: "General",
          icon: "Cube",
          fields: {
            batteryTopic: {
              label: "Battery topic",
              input: "select",
              options: batteryTopicOptions,
              value: config.batteryTopic,
            },
          },
        },
      },
    });
  }, [context, actionHandler, config, topics]);

  // Subscribe to wanted topics
  useEffect(() => {
    context.saveState({ topic: config });
    let topicsList = [];

    if (config.batteryTopic) {
      topicsList.push({ topic: config.batteryTopic });
    }
    context.subscribe(topicsList);
  }, [context, config]);

  // Main Layout effect
  useLayoutEffect(() => {
    context.onRender = (renderState, done) => {
      setRenderDone(() => done);

      setMessages(renderState.currentFrame);
      setTopics(renderState.topics);
    };

    context.watch("topics");
    context.watch("currentFrame");

  }, [context]);

  useEffect(() => {
    if (messages) {
      for (const message of messages) {
        if (message.topic === config.batteryTopic) {
          setbatteryMessage(message.message as BatteryState);
        }
      }
    }
  }, [messages]);

  // invoke the done callback once the render is complete
  useEffect(() => {
    renderDone?.();
  }, [renderDone]);

  return (
    <div style={{ padding: "1rem", borderRadius: "0.5rem" }}>
      <BatteryLevelIndicator level={(batteryMessage?.percentage ?? 0) * 100} />
    </div>
  );
}

export function initBatteryDisplay(context: PanelExtensionContext): () => void {
  ReactDOM.render(<BatteryDisplay context={context} />, context.panelElement);

  // Return a function to run when the panel is removed
  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}
