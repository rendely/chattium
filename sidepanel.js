
import * as openai from  "./openai.js";
import { newMessage } from "./openai.js";

const p = document.querySelector('#prompt');
const form = document.querySelector('#form');
const t = document.querySelector('#thinking');
form.addEventListener('submit', handleSubmit);

async function handleSubmit(e){
    e.preventDefault();
    t.hidden=false;
    const prompt = p.value;    
    openai.getResponse(await newMessage(prompt));    
}
