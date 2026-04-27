import { prisma } from "../lib/prisma.js";

async function createProfile(req, res) {
  const { name: userInput } = req.body;

  if (!userInput) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing or empty name" });
  }

  if (typeof userInput !== "string") {
    return res.status(422).json({
      status: "error",
      message: "Invalid type",
    });
  }

  const name = userInput.toLowerCase();

  try {
    const existingProfile = await prisma.profile.findUnique({
      where: {
        name,
      },
    });

    if (existingProfile)
      return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: existingProfile,
      });

    const [genderRes, agifyRes, nationalizeRes] = await Promise.all([
      fetch(`https://api.genderize.io?name=${name}`),
      fetch(`https://api.agify.io?name=${name}`),
      fetch(`https://api.nationalize.io?name=${name}`),
    ]);

    if (!genderRes.ok || !agifyRes.ok || !nationalizeRes.ok) {
      return res.status(500).json({
        status: "error",
        message: "One or more external APIs failed",
      });
    }

    const [genderData, agifyData, nationalizeData] = await Promise.all([
      genderRes.json(),
      agifyRes.json(),
      nationalizeRes.json(),
    ]);

    const {
      gender,
      probability: gender_probability,
      count: sample_size,
    } = genderData;

    if (gender == null || sample_size == 0) {
      return res.status(502).json({
        status: "502",
        message: "Genderize returned an invalid response",
      });
    }

    const { age } = agifyData;

    if (age == null) {
      return res.status(502).json({
        status: "502",
        message: "Agify returned an invalid response",
      });
    }

    let age_group;
    if (age >= 60) {
      age_group = "senior";
    } else if (age >= 20) {
      age_group = "adult";
    } else if (age >= 13) {
      age_group = "teenager";
    } else {
      age_group = "child";
    }

    const { country: country_list } = nationalizeData;

    if (!country_list || country_list.length === 0) {
      return res.status(502).json({
        status: "502",
        message: "Nationalize returned an invalid response",
      });
    }

    const mostLikelyCountry = country_list.reduce(
      (prev, curr) => (curr.probability > prev.probability ? curr : prev),
      { country_id: null, probability: 0 }
    );
    const { country_id, probability: country_probability } = mostLikelyCountry;

    const profile = await prisma.profile.create({
      data: {
        name,
        gender,
        gender_probability,
        sample_size,
        age,
        age_group,
        country_id,
        country_probability,
      },
    });

    return res.status(201).json({
      status: "success",
      data: {
        id: profile.id,
        name,
        gender: profile.gender,
        gender_probability: profile.gender_probability,
        sample_size: profile.sample_size,
        age: profile.age,
        age_group: profile.age_group,
        country_id: profile.country_id,
        country_probability: profile.country_probability,
        created_at: profile.created_at,
      },
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      status: "error",
      message: "Upstream or server failure",
    });
  }
}

async function getProfile(req, res) {
  const profileId = req.params["profileId"];

  try {
    const profile = await prisma.profile.findUnique({
      where: {
        id: profileId,
      },
    });

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found",
      });
    }

    return res.status(200).json({ status: "success", data: profile });
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ status: "error", message: "Upstream or server failure" });
  }
}

async function getAllProfiles(req, res) {
  const { gender, country_id, age_group } = req.query;

  try {
    const profiles = await prisma.profile.findMany({
      where: {
        gender: gender ? { equals: gender, mode: "insensitive" } : undefined,
        country_id: country_id
          ? { equals: country_id, mode: "insensitive" }
          : undefined,
        age_group: age_group
          ? { equals: age_group, mode: "insensitive" }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        gender: true,
        age: true,
        age_group: true,
        country_id: true,
      },
    });

    return res.status(200).json({
      status: "success",
      count: profiles.length,
      data: profiles,
    });
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ status: "error", message: "Upstream or server failure" });
  }
}

async function deleteProfile(req, res) {
  const profileId = req.params["profileId"];

  try {
    await prisma.profile.delete({
      where: { id: profileId },
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error.message);
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ status: "error", message: "Profile not found" });
    }
    return res
      .status(500)
      .json({ status: "error", message: "Upstream or server failure" });
  }
}

export { createProfile, getProfile, getAllProfiles, deleteProfile };
