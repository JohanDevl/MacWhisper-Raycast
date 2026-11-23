import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { errorMessage, findModel, listModels, selectModel } from "./lib/mw";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SwitchModel }>) {
  try {
    const models = await listModels();
    const { match, candidates } = findModel(models, props.arguments.model);
    if (!match) {
      const list = (candidates.length > 0 ? candidates : models).map((model) => model.name).join(", ");
      await showToast({
        style: Toast.Style.Failure,
        title: candidates.length > 1 ? `"${props.arguments.model}" matches several models` : "No matching model",
        message: list ? `Downloaded: ${list}` : "No model is downloaded yet.",
      });
      return;
    }
    if (match.active) {
      await showHUD(`${match.name} is already active`);
      return;
    }
    await selectModel(match.id);
    await showHUD(`Switched to ${match.name}`);
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Could not switch model", message: errorMessage(error) });
  }
}
