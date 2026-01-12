let activityService = require('../services/activity.service');

let sendSuccess=(res,statusCode,data=null,message=null,extra={})=>{
  let response={success:true}
  if(data) response.data=data
  if(message) response.message=message
  Object.assign(response,extra)
  res.status(statusCode).json(response)
}

let sendError=(res,statusCode,message)=>{
  res.status(statusCode).json({ success:false,message})
}

let createActivity = async (req, res) => {
  let activity=await activityService.createActivity(req.params.tripId,req.body,req.user.id)
  sendSuccess(res,201,activity,'Activity created successfully')
}

let getActivitiesByTrip = async (req, res) => {
  let activities=await activityService.getActivitiesByTrip(req.params.tripId,req.user.id)
  sendSuccess(res,200,activities,null,{count:activities.length}) 
}

let getActivityById = async (req, res) => {
  let activity=await activityService.getActivityById(req.params.activityId,req.user.id)
  sendSuccess(res,200,activity)
}

let updateActivity = async (req, res) => {
  let activity=await activityService.updateActivity(req.params.activityId,req.body,req.user.id)
  sendSuccess(res,200,activity,'Activity updated successfully')
}

const deleteActivity = async (req, res) => {
  let result=await activityService.deleteActivity(req.params.activityId,req.user.id)
  sendSuccess(res,200,null,result.message) 
}

let getActivitiesByDate = async (req, res) => {
  if(!req.query.date){
    return sendError(res,400,'Date query parameter required')
  }
  let activities=await activityService.getActivitiesByDate(req.params.tripId,req.query.date,req.user.id)
  sendSuccess(res,200,activities,null,{count:activities.length})
}

let updateActivityStatus = async (req, res) => {
  if(!req.body.status){
    return sendError(res,400,'Status required')
  }
  let activity=await activityService.updateActivityStatus(req.params.activityId,req.body.status,req.user.id)
  sendSuccess(res,200,activity,'Activity status updated successfully')
}

module.exports = {
  createActivity,
  getActivitiesByTrip,
  getActivityById,
  updateActivity,
  deleteActivity,
  getActivitiesByDate,
  updateActivityStatus,
};
