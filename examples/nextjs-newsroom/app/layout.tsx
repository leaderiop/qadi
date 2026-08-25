import type { ReactNode } from "react";

export const metadata = {
  title: "Qadi — newsroom",
  description: "The SSR/hydration topology, running",
};

const RootLayout = ({ children }: { readonly children: ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
