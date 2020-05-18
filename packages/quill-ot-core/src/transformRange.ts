import { RangeStatic } from "quill";
import Delta from "quill-delta";

const transformRange = (
  delta: Delta,
  range: RangeStatic,
  priority: boolean = false
) => {
  if (range.length === 0) {
    return {
      index: delta.transformPosition(range.index, priority),
      length: 0
    };
  }

  const index = delta.transformPosition(range.index, priority);
  const tailIndex = delta.transformPosition(
    range.index + range.length,
    priority
  );

  return {
    index,
    length: tailIndex - index
  };
};

export default transformRange;
