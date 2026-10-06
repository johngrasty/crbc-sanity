// Loaded with node --import before every test file. See hooks.mjs.
import {register} from 'node:module'

register('./hooks.mjs', import.meta.url)
