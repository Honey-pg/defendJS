export function deepMerge<T extends object, U extends Partial<T>>(
    target: T,
    source: U,
    options: { mergeArrays?: boolean; skipUndefined?: boolean } = {}
): T & U {
    const { mergeArrays = false, skipUndefined = true } = options;
    
    if (!source || typeof source !== 'object') {
        return target as T & U;
    }
    
    const output: any = Array.isArray(target) 
        ? [...target] 
        : { ...target };
    
    for (const key in source) {
        if (!source.hasOwnProperty(key)) continue;
        
        const sourceValue = (source as any)[key];
        const targetValue = (target as any)[key];
        
        if (skipUndefined && sourceValue === undefined) continue;
        
        if (sourceValue === null) {
            output[key] = null;
            continue;
        }
        
        if (mergeArrays && Array.isArray(targetValue) && Array.isArray(sourceValue)) {
            output[key] = [...targetValue, ...sourceValue];
            continue;
        }
        
        if (sourceValue && typeof sourceValue === 'object' &&
            targetValue && typeof targetValue === 'object' &&
            !Array.isArray(sourceValue) && !Array.isArray(targetValue) &&
            sourceValue.constructor === Object && targetValue.constructor === Object) {
            
            output[key] = deepMerge(targetValue, sourceValue, options);
            continue;
        }
        
        output[key] = sourceValue;
    }
    
    const symbols = Object.getOwnPropertySymbols(source);
    for (const sym of symbols) {
        output[sym] = (source as any)[sym];
    }
    
    return output as T & U;
}