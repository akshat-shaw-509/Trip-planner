let tripService = require('../services/trip.service')

let sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
    let response = { success: true }
    if (data) response.data = data
    if (message) response.message = message
    Object.assign(response, extra)

    res.status(statusCode).json(response)
}

let createTrip = async (req, res, next) => {
    let trip = await tripService.createTrip(req.body, req.user.id)
    sendSuccess(res, 201, trip, 'Trip created successfully')
}

let getUserTrips = async (req, res, next) => {
    let filters={
        status:req.query.status,
        search:req.query.search,
        sortBy:req.query.sortBy,
        page:req.query.page,
        limit:req.query.limit,
    }
    let result=await tripService.getTripsByUser(req.user.id,filters)
    sendSuccess(res,200,result.trips,null,{pagination:result.pagination})
}

let getTripById = async (req, res, next) => {
    let trip=await tripService.getTripById(req.params.tripId,req.user.id)
    sendSuccess(res,200,trip)
}

let updateTrip = async (req, res, next) => {
    let trip=await tripService.updateTrip(req.params.tripId,req.body,req.user.id)
    sendSuccess(res,200,trip,'Trip updated successfully')
}

let deleteTrip = async (req, res, next) => {
   let result=await tripService.deleteTrip(req.params.tripId,req.user.id)
   sendSuccess(res,200,null,result.message)
}

let getUpcomingTrips = async (req, res, next) => {
    let trips=await tripService.getUpcomingTrips(req.user.id)
   sendSuccess(res,200,trips,null,{count:trips.length})
}

let getOngoingTrips = async (req, res, next) => {
     const trips = await tripService.getOngoingTrips(req.user.id)
  sendSuccess(res, 200, trips, null, { count: trips.length })
}

let getPastTrips = async (req, res, next) => {
 let trips = await tripService.getPastTrips(req.user.id, parseInt(req.query.limit) || 10)
  sendSuccess(res, 200, trips, null, { count: trips.length })   
}

let addCollaborator = async (req, res, next) => {
    let trip = await tripService.addCollaborator(req.params.tripId, req.body, req.user.id);
    sendSuccess(res, 200, trip, 'Collaborator added successfully');  
}

let removeCollaborator = async (req, res, next) => {
    let trip=await tripService.removeCollaborator(req.params.tripId,req.params.collaboratorId,req.user.id)
    sendSuccess(res,200,trip,'Collaborator removed successfully')   
}

let updateTripStatus = async (req, res, next) => {
    if(!req.body.status){
        return res.status(400).json({
            success:false,
            message:'Status is required'
        })
    }
    let trip=await tripService.updateTripStatus(req.params.tripId,req.body.status,req.user.id)
    sendSuccess(res,200,trip,'Trip status updated successfully')
}

module.exports = {
    createTrip,
    getUserTrips,
    getTripById,
    updateTrip,
    deleteTrip,
    getUpcomingTrips,
    getOngoingTrips,
    getPastTrips,
    addCollaborator,
    removeCollaborator,
    updateTripStatus,
};