import type { DrumpadHeaderProps } from "./DrumpadHeader.types";
import { DEFAULT_HEADER_TITLE } from "./DrumpadHeader.utilities";
import { titleClassName, wrapperClassName } from "./DrumpadHeader.styles";

const DrumpadHeader = ({ title = DEFAULT_HEADER_TITLE }: DrumpadHeaderProps) => {
  return (
    <div className={wrapperClassName}>
      <h1 className={titleClassName}>{title}</h1>
    </div>
  );
};

export default DrumpadHeader;
