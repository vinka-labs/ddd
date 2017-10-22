//  -*- coding: utf-8 -*-
//  testFactory.js ---
//  created: 2015-10-25 09:12:47
//

'use strict';

const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Code = require('code');
const expect = Code.expect;
const moment = require('moment');
const Factory = require('..').Factory;

class Starbuck {
    constructor () {
        this.ammo = {
            rear: 948,
            front: 2344,
        };
    }
}

lab.experiment('Factory', () => {

    lab.test('give undefined to toJSON', done => {
        const f = new Factory();
        const json = f.toJSON();
        expect(json).to.be.undefined();
        const entity = f.fromJSON();
        expect(entity).to.be.undefined();
        done();
    });

    lab.test('give null to toJSON', done => {
        const f = new Factory();
        const json = f.toJSON(null);
        expect(json).to.be.undefined();
        const entity = f.fromJSON(null);
        expect(entity).to.be.undefined();
        done();
    });

    lab.test('custom toJSON', done => {
        function locToJson(value) {
            return {
                rear: value.rear + 1,
                front: value.front + 1,
            };
        }
        const f = new Factory([{key: 'ammo', toJSON: locToJson}], Starbuck);
        const a = f.fromJSON({ammo: {rear: 22, front: 44}});
        expect(a.ammo).to.be.equal({rear: 22, front: 44});
        const aJSON = f.toJSON(a);
        expect(aJSON).to.be.equal({ammo: {rear: 23, front: 45}});

        done();
    });

    lab.test('prevent adding random properties', done => {
        const f = new Factory(['ammo'], Starbuck);

        const o = f.fromJSON({viper: 3});
        expect(Object.keys(o)).to.be.equal(['ammo']);
        expect(o.viper).to.not.exist();
        expect(() => o.six = 6).to.throw(/not.extensible/);

        done();
    });

    lab.test('take shallow copy', done => {
        const f = new Factory(['ammo'], Starbuck);
        const a = new Starbuck();
        const aJSON = f.toJSON(a);

        expect(aJSON).to.be.equal({ammo: {rear: 948, front: 2344}});
        a.ammo.rear = 33;
        expect(aJSON.ammo.rear).to.be.equal(33);

        const b = f.fromJSON(aJSON);
        expect(b instanceof Starbuck).to.be.true();
        expect(Starbuck.prototype.isPrototypeOf(b)).to.be.true();
        expect(b.ammo.rear).to.be.equal(33);
        expect(b.ammo.front).to.be.equal(2344);
        aJSON.ammo.front = 99;
        expect(b.ammo.front).to.be.equal(99);

        done();
    });

    lab.test('timestamp field', done => {
        const f = new Factory([{
            key: 'freetime',
            timestamp: {moment: moment}
        }]);

        const ent = f.fromJSON({freetime: '2016-03-09T08:00:00-04:00'});
        const jsn = f.toJSON(ent);
        expect(jsn.freetime).to.be.equal('2016-03-09T12:00:00Z');

        const entity = new Starbuck();
        entity.freetime = moment.utc('2016-03-09T00:23:22-04:00');

        const json = f.toJSON(entity);
        expect(json).to.be.equal({freetime: '2016-03-09T04:23:22Z'});
        const freetime = f.fromJSON(json).freetime;
        expect(moment.isMoment(freetime)).to.be.true();
        expect(freetime.year()).to.be.equal(2016);
        expect(freetime.minute()).to.be.equal(23);

        done();
    });

    lab.test('nested', done => {
        const locationFactory = {
            toJSON: (val) => `myJSONlocation ${val}`,
            fromJSON: (val) => `myEntityLocation ${val}`,
        };

        const f = new Factory([{
            key: 'stop',
            nested: {factory: locationFactory},
        }]);

        const entity = {};
        entity.stop = 'stoppi';

        const json = f.toJSON(entity);
        expect(json.stop).to.be.equal('myJSONlocation stoppi');
        const entsz = f.fromJSON(json).stop;
        expect(entsz).to.be.equal('myEntityLocation myJSONlocation stoppi');

        done();
    });

    lab.test('collection', done => {
        const locationFactory = {
            toJSON: (val) => `myJSONlocation ${val}`,
            fromJSON: (val) => `myEntityLocation ${val}`,
        };

        const f = new Factory([{
            key: 'stops',
            nested: {factory: locationFactory, collection: true},
        }]);

        const entity = {
            stops: [1, 2],
        };

        const json = f.toJSON(entity);
        expect(json.stops).to.be.equal(['myJSONlocation 1', 'myJSONlocation 2']);
        const entsz = f.fromJSON(json).stops;
        expect(entsz).to.be.equal([
            'myEntityLocation myJSONlocation 1',
            'myEntityLocation myJSONlocation 2',
        ]);

        done();
    });

    lab.test('overrides', done => {
        const f = new Factory(['ammo'], Starbuck);
        const a = f.fromJSON({ammo: {rear: 1, front: 2}});
        expect(a.ammo).to.be.equal({rear: 1, front: 2});
        const b = f.fromJSON({ammo: {rear: 1, front: 2}}, {ammo: {rear: 0, front: 0}});
        expect(b.ammo).to.be.equal({rear: 0, front: 0});

        done();
    });

    lab.test('take copy', done => {
        const f = new Factory([{key: 'ammo', copy: true}], Starbuck);
        const a = new Starbuck();
        const aJSON = f.toJSON(a);

        expect(aJSON).to.be.equal({ammo: {rear: 948, front: 2344}});
        a.ammo.rear = 33;
        expect(aJSON.ammo.rear).to.be.equal(948);
        const b = f.fromJSON(aJSON);
        expect(b.ammo.rear).to.be.equal(948);
        a.ammo.rear = 99;
        expect(b.ammo.rear).to.be.equal(948);

        done();
    });

    lab.test('subclass', done => {
        class FactoryA extends Factory {
            constructor () {
                super(['ammo'], Starbuck);
            }
        }

        const f = new FactoryA();
        const a = f.fromJSON({ammo: {rear: 22, front: 44}});
        expect(a.ammo).to.be.equal({rear: 22, front: 44});
        const aJSON = f.toJSON(a);
        expect(aJSON).to.be.equal({ammo: {rear: 22, front: 44}});

        done();
    });

    lab.test('empty factory', done => {
        const f = new Factory();

        expect(f.toJSON).to.be.a.function();
        expect(f.fromJSON).to.be.a.function();
        expect(f.fromJSON({})).to.be.equal(new Object()); // jshint ignore:line
        expect(f.toJSON(new Object())).to.be.equal({}); // jshint ignore:line

        done();
    });

    lab.test('custom fromJSON', done => {
        function locFromJson(value) {
            return {
                rear: value.rear - 1,
                front: value.front - 1,
            };
        }
        const f = new Factory([{key: 'ammo', fromJSON: locFromJson}], Starbuck);
        const a = f.fromJSON({ammo: {rear: 22, front: 44}});
        expect(a.ammo).to.be.equal({rear: 21, front: 43});
        const aJSON = f.toJSON(a);
        expect(aJSON).to.be.equal({ammo: {rear: 21, front: 43}});

        done();
    });

    lab.test('subclass', done => {
        class FactoryA extends Factory {
            constructor () {
                super(['ammo'], Starbuck);
            }
        }

        const f = new FactoryA();
        const a = f.fromJSON({ammo: {rear: 22, front: 44}});
        expect(a.ammo).to.be.equal({rear: 22, front: 44});
        const aJSON = f.toJSON(a);
        expect(aJSON).to.be.equal({ammo: {rear: 22, front: 44}});

        done();
    });
});

//
//  testFactory.js ends here
