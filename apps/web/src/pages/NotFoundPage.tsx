import { useNavigate } from "react-router-dom";
import * as css from "./not-found-page.css";

export const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div className={css.root}>
      <div className={css.icon}>🔍</div>
      <div className={css.title}>페이지를 찾을 수 없습니다</div>
      <div className={css.desc}>요청하신 페이지가 없거나 이동되었습니다.</div>
      <button type="button" className={css.homeBtn} onClick={() => navigate("/")}>
        홈으로 이동
      </button>
    </div>
  );
};
