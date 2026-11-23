import { Form } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listModels, OUTPUT_FORMATS } from "../lib/mw";
import { FORMAT_TITLES, LANGUAGES } from "../lib/options";

export function ModelDropdown() {
  const { data: models = [], isLoading } = useCachedPromise(listModels, [], {
    failureToastOptions: { title: "Could not list models" },
  });
  return (
    <Form.Dropdown id="model" title="Model" defaultValue="" isLoading={isLoading} storeValue>
      <Form.Dropdown.Item value="" title="MacWhisper's Active Model" />
      {models.map((model) => (
        <Form.Dropdown.Item
          key={model.id}
          value={model.id}
          title={model.active ? `${model.name} (active)` : model.name}
        />
      ))}
    </Form.Dropdown>
  );
}

export function LanguageDropdown() {
  return (
    <Form.Dropdown id="language" title="Language" defaultValue="" storeValue>
      <Form.Dropdown.Item value="" title="Extension / App Default" />
      {LANGUAGES.map((language) => (
        <Form.Dropdown.Item key={language.code} value={language.code} title={language.title} />
      ))}
    </Form.Dropdown>
  );
}

export function FormatDropdown({ defaultValue = "txt" }: { defaultValue?: string }) {
  return (
    <Form.Dropdown id="format" title="Format" defaultValue={defaultValue} storeValue>
      {OUTPUT_FORMATS.map((format) => (
        <Form.Dropdown.Item key={format} value={format} title={FORMAT_TITLES[format]} />
      ))}
    </Form.Dropdown>
  );
}

export function TriStateDropdown({ id, title }: { id: string; title: string }) {
  return (
    <Form.Dropdown id={id} title={title} defaultValue="default" storeValue>
      <Form.Dropdown.Item value="default" title="App Default" />
      <Form.Dropdown.Item value="on" title="On" />
      <Form.Dropdown.Item value="off" title="Off" />
    </Form.Dropdown>
  );
}
