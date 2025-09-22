export const createId = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `frame-${Date.now()}-${counter}`;
  };
})();
