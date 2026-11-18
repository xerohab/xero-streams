import test from 'node:test';
import assert from 'node:assert/strict';
import {allowsKidsContent} from '../src/lib/parentalControls.js';
test('allows explicitly approved ratings',()=>{for(const age_rating of ['U','G','PG','TV-Y','TV-Y7','TV-Y7-FV','TV-G','TV-PG','BBFC U','BBFC PG',' pg '])assert.equal(allowsKidsContent({age_rating}),true);});
test('rejects adult, unknown and unrated titles',()=>{for(const record of [null,{}, {age_rating:'18'}, {age_rating:'12'}, {age_rating:'TV-MA'}, {age_rating:'PG',is_adult:true}])assert.equal(allowsKidsContent(record),false);});
