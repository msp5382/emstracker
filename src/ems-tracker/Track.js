const { prisma } = require("./generated/prisma-client");

const readTrack = async (trackingnum) => {
    const user = await prisma.users({
    where: {
      trackingnum: trackingnum
    }
    }).lineid()
    return user
}

const addTrack = async (newLineid,newTrackingnum) => {
    const updatedOrCreateTrack = await prisma.upsertUser({
        where: {
          lineid: newLineid,
        },
        update: {
          trackingnum: newTrackingnum,
        },
        create: {
          lineid: newLineid,
          trackingnum: newTrackingnum,
        },
    })
}

module.exports = {
    readTrack: readTrack,
    addTrack: addTrack
}

