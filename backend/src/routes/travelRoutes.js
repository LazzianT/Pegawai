const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getAtasanHandler, submitTravelHandler, reminderTravelHandler, getMyTravelsHandler, getMyGroupsHandler, getApprovalHandler, getTravelQrHandler, getTravelGroupQrHandler, scanTravelHandler, getTravelApprovalQueueLinkHandler, approveTravelApprovalQueueLinkHandler, getTravelApprovalLinkHandler, approveTravelApprovalLinkHandler, getVehicleApprovalHandler, getVehicleApprovalQueueLinkHandler, approveVehicleApprovalQueueLinkHandler, getVehicleApprovalLinkHandler, approveVehicleApprovalLinkHandler, approveTravelHandler, returnTravelHandler, getActiveTravelsHandler, webApproveTravelHandler, createTravelGroupHandler, getTravelGroupHandler, joinTravelGroupHandler, confirmTravelGroupHandler, addTravelGroupMemberHandler, removeTravelGroupMemberHandler, submitTravelGroupHandler, reviseTravelGroupHandler, getTravelGroupApprovalsHandler, approveTravelGroupHandler, getGroupApprovalHandler, getGroupVehicleApprovalHandler, approveGroupVehicleHandler, searchTravelGroupEmployeesHandler, addDirectTravelGroupMemberHandler } = require('../controllers/travelController');

const router = express.Router();

// Approve dari web (CodeIgniter) — tanpa JWT, pakai kunci internal. Harus SEBELUM authenticate.
router.post('/web-approve', webApproveTravelHandler);
router.get('/qr/:id/:token', getTravelQrHandler);
router.get('/groups/qr/:code/:token', getTravelGroupQrHandler);
router.post('/qr/scan', authenticate, scanTravelHandler);
router.get('/approval/atasan/queue/:token', getTravelApprovalQueueLinkHandler);
router.post('/approval/atasan/queue/:token', approveTravelApprovalQueueLinkHandler);
router.get('/approval/atasan/:token', getTravelApprovalLinkHandler);
router.post('/approval/atasan/:token', approveTravelApprovalLinkHandler);
router.get('/approval/kendaraan/queue/:token', getVehicleApprovalQueueLinkHandler);
router.post('/approval/kendaraan/queue/:token', approveVehicleApprovalQueueLinkHandler);
router.get('/approval/kendaraan/:token', getVehicleApprovalLinkHandler);
router.post('/approval/kendaraan/:token', approveVehicleApprovalLinkHandler);

router.use(authenticate);

router.get('/atasan', getAtasanHandler);
router.get('/employees', searchTravelGroupEmployeesHandler);
router.get('/groups/mine', getMyGroupsHandler);
router.get('/groups/approval', getGroupApprovalHandler);
router.get('/groups/approval/kendaraan', getGroupVehicleApprovalHandler);
router.post('/groups/approval/kendaraan', approveGroupVehicleHandler);
router.post('/groups', createTravelGroupHandler);
router.get('/groups/:code', getTravelGroupHandler);
router.post('/groups/:code/join', joinTravelGroupHandler);
router.post('/groups/:code/join/confirm', confirmTravelGroupHandler);
router.post('/groups/:code/members', addTravelGroupMemberHandler);
router.post('/groups/:code/members/direct', addDirectTravelGroupMemberHandler);
router.delete('/groups/:code/members/:nip', removeTravelGroupMemberHandler);
router.post('/groups/:code/submit', submitTravelGroupHandler);
router.post('/groups/:code/revise', reviseTravelGroupHandler);
router.get('/groups/:code/approvals', getTravelGroupApprovalsHandler);
router.post('/groups/:code/approvals', approveTravelGroupHandler);
router.post('/reminder', reminderTravelHandler);
router.get('/transaksi', getMyTravelsHandler);
router.get('/approval', getApprovalHandler);
router.get('/approval/kendaraan', getVehicleApprovalHandler);
router.get('/active', getActiveTravelsHandler);
router.post('/approval/approve', approveTravelHandler);
router.post('/submit', submitTravelHandler);
router.post('/return', returnTravelHandler);

module.exports = router;
