import { ChildProcess } from "child_process";

declare global {
  // eslint-disable-next-line no-var
  var __SERVER_PROCESS__: ChildProcess | undefined;
}
