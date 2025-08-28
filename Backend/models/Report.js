const mongoose = require('mongoose');



const ReportSchema = new mongoose.Schema(

  {

    /* ---------- Legacy flat schema (matches test.reports in Atlas) ---------- */

    name: { type: String, trim: true },

    email: { type: String, trim: true },

    phone: { type: String, trim: true },

    crimeType: { type: String, trim: true },    // e.g., "cyber"

    date: { type: Date },                        // incident date (your Atlas doc uses "date")

    location: { type: String, trim: true },      // e.g., "Lat: xx, Long: yy"

    state: { type: String, trim: true },         // e.g., "GJ"

    description: { type: String, trim: true },

    evidence: { type: [mongoose.Schema.Types.Mixed], default: [] }, // array or mixed



    /* ---------- FIR-style schema (for admin app) ---------- */

    firId: { type: String, index: true,  sparse: true }, // sparse lets many docs have no firId

    complainant: {

      name: { type: String, trim: true },

      email: { type: String, trim: true },

      phone: { type: String, trim: true },

      contact: { type: String, trim: true }, // optional alias if you used "contact" earlier

      address: { type: String, trim: true }

    },

    incidentType: { type: String, trim: true },

    incidentDateTime: { type: Date },

    reportedAt: { type: Date, default: Date.now },

    status: {

      type: String,

      Enum: ['Pending', 'In Progress', 'Resolved', 'Urgent'],

      default: 'Pending'

    },

    assignedOfficer: { type: String, default: 'Unassigned', trim: true }

  },

  { timestamps: true }

);



/* ---------- Helpers ---------- */



// Generate firId only when missing (works with existing docs that never had one)

ReportSchema.pre('save', async function (next) {

  if (!this.firId) {

    const count = await mongoose.model('Report').countDocuments({});

    this.firId = `FIR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

  }

  next();

});



// Virtual for UI convenience (use firId, else _id)

ReportSchema.virtual('displayId').get(function () {
  return this.firId || this.reportId || this._id.toString();
});

ReportSchema.set('toJSON', { virtuals: true });
ReportSchema.set('toObject', { virtuals: true });



/* ---------- IMPORTANT: pin to your real collection ---------- */

module.exports = mongoose.model('Report', ReportSchema, 'reports');