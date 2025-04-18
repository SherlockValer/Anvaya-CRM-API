const {connectDB} = require('./db/db.connect')
connectDB()

const mongoose = require('mongoose')

// Import models
const Lead = require('./models/lead.model')
const SalesAgent = require('./models/salesAgent.model')
const Comment = require('./models/comment.model')
const Tag = require('./models/tag.model')

const express = require('express')

const app = express()
app.use(express.json())

const cors = require('cors')
app.use(cors())

//* Leads API
// (1)  Create a New Lead
const createNewLead = async (leadDetails) => {
    try {
        const {name, source, salesAgent, status, tags, timeToClose, priority} = leadDetails

        
        if(!mongoose.Types.ObjectId.isValid(salesAgent)) {
            throw {type: "INVALID_ID_FORMAT", message: `Invalid ID Format.`}
        } else {
            const salesAgentData = await SalesAgent.findById(salesAgent)
            if(salesAgentData) {
                const newLead = new Lead({
                    name: name,
                    source: source,
                    salesAgent: salesAgentData,
                    status: status,
                    tags: tags,
                    timeToClose: timeToClose,
                    priority: priority
                })

                if(status === 'Closed') {
                    newLead.closedAt = Date.now()
                }
    
                const saveLead = await newLead.save()
                return saveLead
            } else {
                throw {type: "NOT_FOUND", message: `Sales agent with ID ${salesAgent} not found.`}
            }
        }
     
    } catch (error) {
        if(error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message)
            const errorMessages = errors.join('. ')
            const msg = `Invalid Input: ${errorMessages}`
            throw {type: "INVALID_INPUT", message: msg}
        }

        throw error

    }
}

app.post('/leads', async(req, res) => {
    try {
        const response = await createNewLead(req.body)
        if(response.name) {
            res.status(201).json(response)
        } 
    } catch (error) {
        switch(error.type) {
            case "INVALID_ID_FORMAT" : 
                return res.status(400).json({error: error.message});
            case "NOT_FOUND" : 
                return res.status(404).json({error: error.message});
            case "INVALID_INPUT" : 
                return res.status(400).json({error: error.message});
            default :
                return res.status(500).json({error: "Server Error."})
        }
    }
})


// (2) Get All Leads
const getAllLeads = async(query) => {
    try {
        const queryObj = {}
        const errorObj = {type: "INVALID_INPUT", message: 'Invalid input: '}
        const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Closed']
        const validSources = ['Website', 'Referral', 'Cold Call', 'Advertisement', 'Email', 'Other']

        const {salesAgent, status, tags, source} = query

        if(salesAgent) {
            if(mongoose.Types.ObjectId.isValid(salesAgent)) {
                queryObj.salesAgent = salesAgent
            } else {
                errorObj.message += 'Invalid sales agent ObjectId.'
            }
            
        }
        
        if(status) {
            if(validStatuses.includes(status)) {
                queryObj.status = status
            } else {
                errorObj.message += "'status' must be one of ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Closed']."
            }

        }

        if(tags) {
            queryObj.tags = tags
        }

        if(source) {
            if(validSources.includes(source)) {
                queryObj.source = source
            } else {
                errorObj.message += "'source' must be one of ['Website', 'Referral', 'Cold Call', 'Advertisement', 'Email', 'Other']"
            }
        }

        if(errorObj.message !== 'Invalid input: ' ) {
            throw errorObj
        } else {
            const allLeads = await Lead.find(query).populate('salesAgent', 'name')
            if(allLeads && allLeads.length !==0) {
                return allLeads
            } else {
                throw {type: "NOT_FOUND", message: "Lead Data Not Found."}
            }
        }

    } catch (error) {
        throw error
    }
}

app.get('/leads', async(req, res) => {
    try {
        const allLeads = await getAllLeads(req.query)
        if(allLeads) {
            res.status(200).json(allLeads)
        }
    } catch (error) {
        switch (error.type) {
            case "INVALID_INPUT": 
                return res.status(400).json({error: error.message})
            case "NOT_FOUND" :
                return res.status(404).json({error: error.message});
        }
    }
})

// (3) Update a Lead
const updateLead = async(leadId, dataToUpdate) => {
    try {
        if(!mongoose.Types.ObjectId.isValid(leadId)) {
            throw {type: "INVALID_ID_FORMAT", message: "Invalid Lead ID."}
        } else {
            const lead = await Lead.findById(leadId) 
            if(lead) {
                const updatedLead = await Lead.findByIdAndUpdate(
                    leadId, 
                    {$set: dataToUpdate}, 
                    {new: true, runValidators: true}
                )
                if(updatedLead) {
                    return updatedLead
                }
            } else {
                throw {type: "NOT_FOUND", message: "Lead Not Found."}
            }
        }

    } catch (error) {
        if(error.name === "ValidationError") {
            const errors = Object.values(error.errors).map(err => err.message)
            const errorMessages = errors.join('. ')
            const msg = `Invalid Input: ${errorMessages}`
            throw {type: "INVALID_INPUT", message: msg}
        }

        throw error
    }
}

app.put('/leads/:id', async(req, res) => {
    try {
        const updatedLead = await updateLead(req.params.id, req.body)
        if(updatedLead) {
            res.status(200).json(updatedLead)
        }
    } catch (error) {
        switch (error.type) {
            case "INVALID_ID_FORMAT" :
                return res.status(400).json({error: error.message});
            case "NOT_FOUND" :
                return res.status(404).json({error: error.message});
            case "INVALID_INPUT" : 
                return res.status(400).json({error: error.message});
            default :
                return res.status(500).json({error: "Server Error"});
        }        
    }
})

// (4) Delete a Lead
const deleteLead = async(leadId) => {
    try {
        if(!mongoose.Types.ObjectId.isValid(leadId)) {
            throw {type: "INVALID_ID_FORMAT", message: "Invalid Lead ID."}
        } else {
            const lead = await Lead.findById(leadId)
            if(lead) {
                const deletedLead = await Lead.findByIdAndDelete(leadId, {new: true})
                if(deletedLead) {
                    return "Lead deleted Successfully."
                }
            } else {
                throw {type: "NOT_FOUND", message: `Lead with ID '${leadId}' not found.`}
            }
        }
    } catch (error) {
        throw error
    }
}

app.delete('/leads/:id', async(req, res) => {
    try {
        const response = await deleteLead(req.params.id)
        if(response) {
            res.status(200).json({message: response})
        }
    } catch (error) {
        switch (error.type) {
            case "INVALID_ID_FORMAT" :
                return res.status(400).json({error: error.message});
            case "NOT_FOUND" :
                return res.status(404).json({error: error.message});
            default :
                return res.status(500).json({error: "Server Error"});
        }
    }
})

//* Sales Agent API
// (1) Create a New Sales Agent
const createNewSalesAgent = async(agentData) => {
    try {
        const {name, email} = agentData

        const newAgent = new SalesAgent({
            name: name,
            email: email
        })

        const saveAgent = await newAgent.save()
        return saveAgent
    

    } catch (error) {
        console.log(error)
        if(error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message)
            const errorMessages = errors.join('. ')
            const msg = `Invalid Input: ${errorMessages}`
            throw {type: "INVALID_INPUT", message: msg}
        }

        if (error.code === 11000) {
            throw {type: "DUPLICATE_KEY", message: `Sales agent with email '${agentData.email}' already exists.'`}
        }
    }
}

app.post('/agents', async(req, res) => {
    try {
        const agent = await createNewSalesAgent(req.body)
        if(agent) {
            res.status(201).json(agent)
        } 
    } catch (error) {
        switch(error.type) {
            case "INVALID_INPUT" : 
                return res.status(400).json({error: error.message});
            
            case "DUPLICATE_KEY" :
                return res.status(409).json({error: error.message});

            default :
                return res.status(500).json({error: "Server Error."})
        }
        
    }
})

// (2) Get all sales agents
const getAllSalesAgents = async() => {
    try {
        const allSalesAgents = await SalesAgent.find()
        if(allSalesAgents && allSalesAgents.length !== 0) {
            return allSalesAgents
        } else {
            throw {type: "NOT_FOUND", message: "Sales Agents Not Found."}
        }
    } catch (error) {
        throw error
    }
}

app.get('/agents', async(req, res) => {
    try {
        const response = await getAllSalesAgents()
        if(response) {
            res.status(200).json(response)
        }
    } catch (error) {
        switch (error.type) {
            case "NOT_FOUND" :
                return res.status(404).json({error: error.message});
            default :
                return res.status(500).json({error: "Server Error."})
        }
    }
})

//* Comments API
// (1) Add a Comment to a Lead
const addComments = async(leadId, commentData) => {
    try {
        const {commentText, author} = commentData

        if(!mongoose.Types.ObjectId.isValid(leadId)) {
            throw {type: "INVALID_LEAD_ID", message: 'Invalid Lead ID.'}
        } else if (!mongoose.Types.ObjectId.isValid(author)) {
            throw {type: "INVALID_AGENT_ID", message: 'Invalid Sales Agent ID.'}
        } else {
            const lead = await Lead.findById(leadId)
            if(lead) {
                const newComment = new Comment({
                    lead: leadId,
                    commentText : commentText,
                    author: author
                })
                const saveComment = await newComment.save()
                return saveComment
            } else {
                throw {type: "NOT_FOUND", message: `Lead with ID '${leadId}' not found.`}
            }
        }
    } catch (error) {
        if(error.name === "ValidationError") {
            const errors = Object.values(error.errors).map(err => err.message)
            const errorMessages = errors.join('. ')
            const msg = `Invalid Input: ${errorMessages}`
            throw {type: "INVALID_INPUT", message: msg}
        }

        throw error
    }
}

app.post('/leads/:id/comments', async(req, res) => {
    try {
        const addedComment = await addComments(req.params.id, req.body)
        if(addedComment) {
            res.status(201).json(addedComment)
        }
    } catch (error) {
        switch (error.type) {
            case "INVALID_LEAD_ID" : 
                return res.status(400).json({error: error.message});
            case "INVALID_AGENT_ID" :
                return res.status(400).json({error: error.message});
            case "NOT_FOUND" :
                return res.status(404).json({error: error.message});
            case "INVALID_INPUT" :
                return res.status(400).json({error: error.message});
        }
    }
})

// (2) Get All Comments for a lead
const getAllComments = async(leadId) => {
    try {
        if(!mongoose.Types.ObjectId.isValid(leadId)) {
            throw {type: "INVALID_ID_FORMAT", message: "Invalid Lead ID Format."}
        } else {
            const allComments = await Comment.find({lead: leadId}).populate('author')
            if(allComments && allComments.length !==0) {
                return allComments
            } else {
                throw {type: "NOT_FOUND", message: `Comments for lead ID '${leadId}' not found.`}
            }
        }
    } catch (error) {
        throw error
    }
}

app.get('/leads/:id/comments', async(req, res) => {
    try {
       const allComments = await getAllComments(req.params.id) 
       if(allComments) {
            res.status(200).json(allComments)
       }
    } catch (error) {
        switch (error.type) {
            case "INVALID_ID_FORMAT" :
                return res.status(400).json({error: error.message});
            case "NOT_FOUND" :
                return res.status(404).json({error: error.message});
            default :
                return res.status(500).json({error: "Server Error."})
        }   

    }
})

//* Reporting API
// (1) Get leads closed last week
const leadsClosedLastWeek = async() => {
    try {
        const sevenDaysAgo = new Date()        
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const closedLeads = await Lead.find({closedAt: {$gte: sevenDaysAgo}})
        if(closedLeads && closedLeads.length !== 0) {
            return closedLeads
        } else {
            throw {type: "NOT_FOUND", message: `No Closed Leads for Last Week found.`}
        }
    } catch (error) {
        throw error
    }
}

app.get('/report/last-week', async(req, res) => {
    try {
        const closedLeads = await leadsClosedLastWeek()
        if(closedLeads) {
            res.status(200).json(closedLeads)
        }
    } catch (error) {
        switch(error.type) {
            case "NOT_FOUND" :
                return res.status(404).json({error: error.message});
            default :
                return res.status(500).json({error: "Server Error."})
        }
    }
})

// (2) Get Total Leads in Pipeline
const getTotalLeadsInPipeline = async () => {
    try {
        const totalLeads = await Lead.find({status: {$ne: 'Closed'}}) // $ne = not equal to
        if(totalLeads && totalLeads.length !== 0) {
            return totalLeads.length
        } else {
            throw {type: "NOT_FOUND", message: 'No Leads Found.'}
        }
    } catch (error) {
        throw error
    }
}

app.get('/report/pipeline', async(req, res) => {
    try {
        const totalLeadsNum = await getTotalLeadsInPipeline()
        if(totalLeadsNum) {
            res.status(200).json({totalLeadsInPipeline: totalLeadsNum})
        }
    } catch (error) {
        switch (error.type) {
            case "NOT_FOUND" :
                return res.status(404).json({error: error.message})
            default :
                return res.status(500).json({error: "Server Error."})
        }
    }
})

//* Tag API
// (1) Add new tags
const addNewTag = async (tagObj) => {
    try {
        const newTag = new Tag({
            name: tagObj.name
        })

        const saveTag = await newTag.save()
        return saveTag
    } catch (error) {
        if(error.name === "ValidationError") {
            const errors = Object.values(error.errors).map(err => err.message)
            const errorMessages = errors.join('. ')
            const msg = `Invalid Input: ${errorMessages}`
            throw {type: "INVALID_INPUT", message: msg}
        }

        if (error.name === "MongoServerError" && error.code === 11000) {
            throw {type: "DUPLICATE_KEY", message: `Tag with name '${tagObj.name}' already exists.'`}
        }

        throw error
    }
}

app.post('/tags', async(req, res) => {
    try {
        const newTag = await addNewTag(req.body)
        if(newTag) {
            res.status(200).json({message: "New Tag Created Successfully!"})
        }
    } catch (error) {
        switch (error.type) {
            case "INVALID_INPUT" :
                return res.status(400).json({error: error.message})
            case "DUPLICATE_KEY" :
                return res.status(409).json({error: error.message})
            default :
                return res.status(500).json({error: "Server Error."})
        }
    }
})

// (2) Get all tags
const getAllTags = async() => {
    try {
        const allTags = await Tag.find()
        if(allTags && allTags.length !==0) {
            return allTags
        } else {
            throw {type: "NOT_FOUND", message: "No Tags Found."}
        }
    } catch (error) {
        throw error
    }
}

app.get('/tags', async(req,res) => {
    try {
        const response = await getAllTags()
        if(response) {
            res.status(200).json(response)
        }
    } catch (error) {
        switch (error.type) {
            case "NOT_FOUND" :
                return res.status(404).json({error: error.message});
            default :
                return res.status(500).json({error: "Server Error."})
        }
    }
})

// Start the server
const PORT = 3000
app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`)
})

