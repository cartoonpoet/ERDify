import { Button, lightThemeClass } from "@lawkit/ui";
import "@lawkit/ui/style.css";
import { brand, content, emptyState, main, shell, sidebar, topbar } from "./app.css";

export function App() {
  return (
    <div className={`${lightThemeClass} ${shell}`}>
      <header className={topbar}>
        <div className={brand}>ERDify</div>
        <Button color="primary" size="medium">
          새 ERD
        </Button>
      </header>
      <div className={content}>
        <aside className={sidebar}>프로젝트</aside>
        <main className={main}>
          <section className={emptyState}>프로젝트를 선택하면 ERD 목록이 표시됩니다.</section>
        </main>
      </div>
    </div>
  );
}
