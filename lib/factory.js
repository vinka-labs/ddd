//  -*- coding: utf-8 -*-
//  factory.js ---
//  created: 2016-02-28 14:36:07
//

'use strict';

const assert = require('assert');
const _ = require('lodash');

/**
 * Helper to assign (not copy) data from `source` to `target`.
 *
 * @param {String[]} keys - property names to assign.
 * @param {object} source - source.
 * @param {object} target - target.
 * @returns target.
 */
const assignData = function (keys, source, target, overrides) {
    target = target || {};
    overrides = overrides || {};

    keys.forEach((key) => {
        target[key] = overrides[key] || source[key];
    });

    return target;
};

/**
 * Create property data mapper for a factory.
 *
 * There should be one mapper for each property in an entity. Mappers are
 * used when converting entities to and from JSON.
 *
 * @param {Object|String} def - instructions for the test initialization. This
 *    can also be just the name of the property, in which case, the value will
 *    be simply assigned from source to target when making conversions.
 * @param {String} [def.key] - name of the property.
 * @param {Boolean} [def.copy] - whether to deep copy value of the property.
 * @param {Object} [def.timestamp] - if the field is a timestamp.
 * @param {Object} [def.timestamp.moment] - moment library instance.
 * @param {Function} [def.toJSON] - custom toJSON function for the property.
 * @param {Function} [def.fromJSON] - custom fromJSON function for the property.
 * @param [klass] - The type of the parent. This can be used for debugging purposes.
 */
const createMapper = function (def, klass) {
    // @todo perform joi validation to def parameter

    const key = _.isString(def) ? def : def.key;
    assert(key && _.isString(key));

    const mapper = {
        toJSON: (value) => value,
        fromJSON: (value) => value,
    };

    if (def.timestamp) {
        mapper.toJSON = time => {
            if (!time) {
                return null;
            }

            if (typeof time.format !== 'function') {
                const classname = klass ? klass.toString().split(' ')[1] : 'unknown';
                throw Error(`illegal time value ${time} (${typeof time}) for type ${classname}`);
            }

            return time.format();
        };
        mapper.fromJSON = time => time ? def.timestamp.moment.utc(time) : undefined;
    }

    if (def.nested) {
        const factory = def.nested.factory;

        if (def.nested.collection) {
            mapper.toJSON = ents => ents ? ents.map(factory.toJSON.bind(factory)) : null;
            mapper.fromJSON = jsons => jsons ? jsons.map(factory.fromJSON.bind(factory)) : undefined;
        } else {
            mapper.toJSON = factory.toJSON.bind(factory);
            mapper.fromJSON = factory.fromJSON.bind(factory);
        }
    }

    if (def.hasOwnProperty('copy')) {
        if (def.copy) {
            mapper.toJSON = (value) => _.cloneDeep(value);
            mapper.fromJSON = (value) => _.cloneDeep(value);
        } else {
            mapper.toJSON = (value) => value;
            mapper.fromJSON = (value) => value;
        }
    }

    if (def.toJSON) {
        assert(_.isFunction(def.toJSON));
        mapper.toJSON = def.toJSON;
    }

    if (def.fromJSON) {
        assert(_.isFunction(def.fromJSON));
        mapper.fromJSON = def.fromJSON;
    }

    return [key, mapper];
};

/**
 * @class Factory
 *
 * Base class for entity factories.
 *
 * This can be parametrized by top level property names and class constructor.
 */
class Factory {
    constructor (keys, klass) {
        this.klass = klass || Object;
        this.mapper = (keys) ? _.fromPairs(keys.map(k => createMapper(k, klass))) : {};
        this.keys = Object.keys(this.mapper);
    }

    /**
     * Convert entity into plain JSON object.
     */
    toJSON (entity, overrides) {
        if (!entity) {
            return undefined;
        }

        const ret = {};
        overrides = overrides || {};

        this.keys.forEach((key) => {
            ret[key] = overrides[key] || this.mapper[key].toJSON(entity[key]);
        });

        return ret;
    }

    /**
     * Create entity from the given JSON object.
     */
    fromJSON (json, overrides) {
        if (!json) {
            return undefined;
        }

        const entity = (this.klass) ? new this.klass() : {};
        overrides = overrides || {};

        this.keys.forEach((key) => {
            entity[key] = overrides[key] || this.mapper[key].fromJSON(json[key]);
        });

        return Object.seal(entity);
    }
}

module.exports = Factory;
module.exports.assignData = assignData;

//
//  factory.js ends here
