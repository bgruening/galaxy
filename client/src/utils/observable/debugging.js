/**
 * Rxjs debugging utility
 * See: https://cartant.github.io/rxjs-spy/
 */

import config from "config";
import { create } from "rxjs-spy";
import DevToolsPlugin from "rxjs-spy-devtools-plugin";

if (config.name == "development") {
    console.warn(`enabling rxjs-spy in environment: ${config.name}`);
    console.log("https://cartant.github.io/rxjs-spy/");
    const spy = create({
        sourceMaps: true,
    });
    const devtoolsPlugin = new DevToolsPlugin(spy, {
        verbose: false,
    });
    spy.plug(devtoolsPlugin);

    // We must teardown the spy if we're hot-reloading:
    if (module.hot) {
        if (module.hot) {
            module.hot.dispose(() => {
                spy.teardown();
            });
        }
    }
}
