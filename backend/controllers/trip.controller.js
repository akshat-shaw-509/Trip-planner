let tripService = require('../services/trip.service')
let { asyncHandler } = require('../middleware/error.middleware')
let { ValidationError } = require('../utils/errors')

let sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
    let response = { success: true }
    if (data) response.data = data
    if (message) response.message = message
    Object.assign(response, extra)
    res.status(statusCode).json(response)
}

let createTrip = asyncHandler(async(req, res) => {
    let trip = await tripService.createTrip(req.body, req.user.id)
    sendSuccess(res, 201, trip, 'Trip created successfully')
})

let getUserTrips = asyncHandler(async(req, res) => {
    let filters={
        status:req.query.status,
        search:req.query.search,
        sortBy:req.query.sortBy,
        page:req.query.page,
        limit:req.query.limit,
    }
    let result=await tripService.getTripsByUser(req.user.id,filters)
    sendSuccess(res,200,result.trips,null,{pagination:result.pagination})
})

let getTripById = asyncHandler(async(req, res) => {
    let trip=await tripService.getTripById(req.params.tripId,req.user.id)
    sendSuccess(res,200,trip)
})

let updateTrip = asyncHandler(async(req, res) => {
    let trip=await tripService.updateTrip(req.params.tripId,req.body,req.user.id)
    sendSuccess(res,200,trip,'Trip updated successfully')
})

let deleteTrip = asyncHandler(async(req, res) => {
   let result=await tripService.deleteTrip(req.params.tripId,req.user.id)
   sendSuccess(res,200,null,result.message)
})

let getUpcomingTrips = asyncHandler(async(req, res) => {
    let trips=await tripService.getUpcomingTrips(req.user.id)
   sendSuccess(res,200,trips,null,{count:trips.length})
})

let getOngoingTrips = asyncHandler(async(req, res) => {
     const trips = await tripService.getOngoingTrips(req.user.id)
  sendSuccess(res, 200, trips, null, { count: trips.length })
})

let getPastTrips = asyncHandler(async(req, res) => {
 let trips = await tripService.getPastTrips(req.user.id, parseInt(req.query.limit) || 10)
  sendSuccess(res, 200, trips, null, { count: trips.length })   
})

let addCollaborator = asyncHandler(async(req, res) => {
    let trip = await tripService.addCollaborator(req.params.tripId, req.body, req.user.id);
    sendSuccess(res, 200, trip, 'Collaborator added successfully');  
})

let removeCollaborator = asyncHandler(async(req, res) => {
    let trip=await tripService.removeCollaborator(req.params.tripId,req.params.collaboratorId,req.user.id)
    sendSuccess(res,200,trip,'Collaborator removed successfully')   
})

let updateTripStatus = asyncHandler(async(req, res) => {
    if(!req.body.status){
        return res.status(400).json({
            success:false,
            message:'Status is required'
        })
    }
    let trip=await tripService.updateTripStatus(req.params.tripId,req.body.status,req.user.id)
    sendSuccess(res,200,trip,'Trip status updated successfully')
})

// Upload trip banner
let uploadBanner = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ValidationError('No image file provided');
  }

  let updatedTrip = await tripService.uploadBanner(req.params.tripId, req.user.id, req.file);

  res.status(200).json({
    success: true,
    message: 'Banner uploaded successfully',
    data: {
      _id: updatedTrip._id,
      coverImage: updatedTrip.coverImage
    }
  });
});

// Remove trip banner
let removeBanner = asyncHandler(async (req, res) => {
  let updatedTrip = await tripService.removeBanner(req.params.tripId, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Banner removed successfully',
    data: {
      _id: updatedTrip._id,
      coverImage: null
    }
  });
});

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
    uploadBanner,
    removeBanner
};