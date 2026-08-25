"use client";
/**
 * Mounts the dock, in the browser only.
 *
 * `ssr: false` because the dock opens an `EventSource` and measures elements —
 * neither exists during a server render, and `sourceFromEventSource` throws at
 * construction rather than later precisely so this is caught at the right
 * moment. Deferring the import also keeps `@qadi/devtools/react` out of the
 * server bundle entirely.
 *
 * **Nothing mounts itself.** `@qadi/devtools` declares `"sideEffects": false`
 * and runs nothing on import, so the host decides where the dock goes and
 * whether it goes anywhere. This component is that decision, written down.
 */
import dynamic from "next/dynamic";

const Loaded = dynamic(() => import("./Dock.tsx").then((module) => module.Dock), {
  ssr: false,
});

export const DockMount = ({ enabled }: { readonly enabled: boolean }) =>
  enabled ? <Loaded /> : null;
