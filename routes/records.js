const express = require('express');
const { isLoggedIn, getSuccess, getFailure, getValidationError, updateForEach } = require('./middlewares');
const { Variable, Record, DateRecord } = require('../models');
const router = express.Router();

router.post('/', isLoggedIn, 
    async (req, res, next) => {
        // 만약 요청한 VariableId, RecordId, DateRecordId 값이 없으면 validationError 리턴
        const { record, VariableId, DateRecordId } = req.body;
        const params = { record, VariableId, DateRecordId };
        const validationError = getValidationError(params);
        if (validationError) {
            return res.status(400).json(validationError);
        }
        else {
            next();
        }
},
    async (req, res, next) => {
        const { record, VariableId, DateRecordId } = req.body;

        const exVariable = await Variable.findOne({where: {id:VariableId}});
        if(!exVariable){ 
            return res.status(404).json(getFailure(req.originalUrl + ' VariableId'));
        }

        const exDateRecord = await DateRecord.findOne({where: {id:DateRecordId}});
        if(!exDateRecord){ 
            return res.status(404).json(getFailure(req.originalUrl + ' DateRecordId'));
        }

        const target = await Record.create({
            record,
            VariableId,
            DateRecordId
        });
        if(!target){
            return res.status(500).json(getFailure(`db error: create`));
        }

        return res.status(201).json(getSuccess(target));
});

router.get('/', isLoggedIn, async (req, res, next) => { 
    try {
        // query options : { VariableId, DateRecordId }
        const { VariableId, DateRecordId } = req.query;
        let records;
        let condition = {};
        if (VariableId) {
            condition.VariableId = VariableId;
        }

        if(DateRecordId){
            condition.DateRecordId = DateRecordId;
        }

        records = await Record.findAll({
            where: condition,
        });
        
        if(records.length === 0){
            return res.status(204).json();
        }

        return res.status(200).json(getSuccess(records));

    } catch (err) {
        console.error(err);
        next(err);
    }
})


router.get('/:id', isLoggedIn, async (req, res, next) => {
    try {
        const { id } = req.params;

        const record = await Record.findOne({ where: { id } });
        if (!record) {
            return res.status(404).json(getFailure(req.originalUrl));
        }

        return res.status(200).json(getSuccess(record));
    } catch (err) {
        console.error(err);
        next(err);
    }
})

router.patch('/:id', isLoggedIn, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { record, VariableId, DateRecordId } = req.body;
        // {VariableId, DateRecordId} Not Null

        const target = await Record.findOne({ where: { id } });
        if (!target) {
            return res.status(404).json(getFailure(req.originalUrl));
        }

        // null 검사
        if(VariableId === null || DateRecordId === null){
            return res.status(400).json(getFailure(`${req.originalUrl} {VariableId, DateRecordId} Not Null`));
        }

        // 하나라도 없으면 400 Bad request
        if(record === undefined && VariableId === undefined && DateRecordId === undefined){
            return res.status(400).json(getFailure(`${req.originalUrl} At least one content is required`));
        }

        if(VariableId){ // req.body에 VariableId가 있을 경우 값이 db에 존재하는지 확인 후 업데이트
            const exVariableId = await Record.findOne({where: {id:VariableId}});
            if(!exVariableId){
                return res.status(404).json(getFailure());
            }
        }

        if(DateRecordId){ // req.body에 VariableId가 있을 경우 값이 db에 존재하는지 확인 후 업데이트
            const exDateRecordId = await Record.findOne({where: {id:DateRecordId}});
            if(!exDateRecordId){
                return res.status(404).json(getFailure());
            }
        }

        const isSame = await updateForEach(target, {record, VariableId, DateRecordId});
        // 기존 데이터과 같다면 204 No Contents
        if(isSame){
            return res.status(204).json();
        }

        return res.status(201).json(getSuccess(target));
    } catch (err) {
        console.error(err);
        next(err);
    }
})


router.delete('/:id', isLoggedIn, async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const record = await Record.findOne({ where: { id } });
        if (!record) {
            return res.status(404).json(getFailure(`there is no vairable where id=${id}`));
        }

        await record.destroy();

        return res.status(204).json();
    } catch (err) {
        console.error(err);
        next(err);
    }
})

module.exports = router;