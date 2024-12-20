import { COLOR } from "../../constants/color";
import { ContentsContainer, ContentsWrapper } from "./ChildMain.style";

const Contents = ({ style, image, title, contents, onClick }) => {
  return (
    <div style={style} onClick={onClick}>
      <ContentsContainer>
        <ContentsWrapper>
          <img style={{width: 38, height: 38}} src={image} alt="" />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                color: COLOR.questionFontColor,
                fontSize: 18,
              }}
            >
              {title}
            </span>
            <span style={{ color: COLOR.gray, fontSize: 15 }}>{contents}</span>
          </div>
        </ContentsWrapper>
      </ContentsContainer>
    </div>
  );
};

export default Contents;
