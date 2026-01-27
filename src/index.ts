import { DefendJS } from "./core/DefendJS.js";
import { useSecure, secureRoute } from "./core/useSecure.js";
export { z } from "zod";
export { body, query, param, header } from "express-validator";

const defendJS = DefendJS.getInstance();

export { 
    DefendJS,        
    defendJS,        
    useSecure,       
    secureRoute      
};

export default defendJS;



