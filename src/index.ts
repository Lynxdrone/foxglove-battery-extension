import { ExtensionContext } from "@foxglove/studio";
import { initBatteryDisplay } from "./BatteryDisplay";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({ name: "Battery display", initPanel: initBatteryDisplay });
}
