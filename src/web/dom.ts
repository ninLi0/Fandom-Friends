/** Small helpers for building pages without a framework. */

type Child = Node | string | null | undefined | false;

/** Makes an element, sets its properties, and adds its children. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  properties: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = Object.assign(document.createElement(tag), properties);
  element.append(...children.filter((child): child is Node | string => Boolean(child)));
  return element;
}

/** Replaces everything inside an element. */
export function fill(element: Element, ...children: Child[]): void {
  element.replaceChildren(...children.filter((child): child is Node | string => Boolean(child)));
}

/** A button that runs an action and stays disabled while it runs, so a double click sends one request. */
export function button(label: string, action: () => unknown, properties: Partial<HTMLButtonElement> = {}): HTMLButtonElement {
  const element = h("button", { type: "button", textContent: label, ...properties });
  element.addEventListener("click", async () => {
    element.disabled = true;
    try {
      await action();
    } finally {
      element.disabled = false;
    }
  });
  return element;
}
