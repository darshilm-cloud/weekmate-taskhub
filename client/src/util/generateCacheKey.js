export const generateCacheKey = (module, reqBody) => {
    const values = Object.values(reqBody);
    const keyParts = [module, ...values];
  
    return keyParts.filter((part) => part !== undefined && part !== "").join("_");
  };
  