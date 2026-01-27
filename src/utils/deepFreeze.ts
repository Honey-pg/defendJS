export function deepFreeze<T>(obj: T, visited = new WeakSet()): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object' && typeof obj !== 'function') return obj;
    
    if (visited.has(obj)) return obj;
    visited.add(obj);
    
    const constructor = obj.constructor;
    const builtIns = [Date, RegExp, Map, Set, WeakMap, WeakSet, Promise];
    if (builtIns.some(builtIn => obj instanceof builtIn)) {
        return obj;
    }
    
    if (typeof obj === 'function') return obj;
    
    Object.freeze(obj);
    
    if (Array.isArray(obj)) {
        for (const item of obj) {
            if (item && typeof item === 'object') {
                deepFreeze(item, visited);
            }
        }
        return obj;
    }
    
    const props = Object.getOwnPropertyNames(obj);
    for (const prop of props) {
        const value = (obj as any)[prop];
        if (value && typeof value === 'object') {
            deepFreeze(value, visited);
        }
    }
    
    const symbols = Object.getOwnPropertySymbols(obj);
    for (const sym of symbols) {
        const value = (obj as any)[sym];
        if (value && typeof value === 'object') {
            deepFreeze(value, visited);
        }
    }
    
    return obj;
}