const {test , expect} = require('@playwright/test')
//const {hello, helloworld} = require('./demo/hello')
import{hello,helloworld} from './demo/hello'

console.log (hello());
console.log(helloworld());