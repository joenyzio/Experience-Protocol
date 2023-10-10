// xapiValidator.js

const ParamError = require("./ParamError");
const convertToDataType = require("./utilities");

// Assuming iriparse and UUID are imported or implemented elsewhere
// const iriparse = require("./iriparse");
const URI = require("uri-js");
const { validate: validateUUID } = require("uuid");

function iriparse(uri) {
  const result = URI.parse(uri);
  if (result.error) {
    throw new ParamError(`Invalid IRI: ${result.error}`, "INVALID_IRI_FORMAT");
  }
  return result;
}

function validateAndReturnUUID(uuidString) {
  if (!validateUUID(uuidString)) {
    throw new ParamError(
      `Invalid UUID format: ${uuidString}`,
      "INVALID_UUID_FORMAT"
    );
  }
  return uuidString;
}

// Dependencies: You might later add libraries for things like IRI validation, UUID validation, etc.
// For example:
// const iriParser = require('some-iri-parser-library');
// const { v4: uuidv4 } = require('uuid');

// Allowed and required fields for various xAPI components
const statementAllowedFields = [
  "id",
  "actor",
  "verb",
  "object",
  "result",
  "stored",
  "context",
  "timestamp",
  "authority",
  "version",
  "attachments",
];
const statementRequiredFields = ["actor", "verb", "object"];

const attachmentAllowedFields = [
  "usageType",
  "display",
  "description",
  "contentType",
  "length",
  "sha2",
  "fileUrl",
];
const attachmentRequiredFields = [
  "usageType",
  "display",
  "contentType",
  "length",
];

const agentIfisCanOnlyBeOne = ["mbox", "mbox_sha1sum", "openid", "account"];
const agentAllowedFields = [
  "objectType",
  "name",
  "member",
  "mbox",
  "mbox_sha1sum",
  "openid",
  "account",
];

const accountFields = ["homePage", "name"];

const verbAllowedFields = ["id", "display"];

const refFields = ["id", "objectType"];

const activityAllowedFields = ["objectType", "id", "definition"];

const actDefAllowedFields = [
  "name",
  "description",
  "type",
  "moreInfo",
  "extensions",
  "interactionType",
  "correctResponsesPattern",
  "choices",
  "scale",
  "source",
  "target",
  "steps",
];

const intActFields = ["id", "description"];

const subAllowedFields = [
  "actor",
  "verb",
  "object",
  "result",
  "context",
  "timestamp",
  "objectType",
];
const subRequiredFields = ["actor", "verb", "object"];

const resultAllowedFields = [
  "score",
  "success",
  "completion",
  "response",
  "duration",
  "extensions",
];

const scoreAllowedFields = ["scaled", "raw", "min", "max"];

const contextAllowedFields = [
  "registration",
  "instructor",
  "team",
  "contextActivities",
  "revision",
  "platform",
  "language",
  "statement",
  "extensions",
  "contextAgents",
  "contextGroups",
];

const contextAgentAllowedFields = ["objectType", "agent", "relevantTypes"];

const contextGroupAllowedFields = ["objectType", "group", "relevantTypes"];

// Define the StatementValidator class
class StatementValidator {
  // Constructor initializes data and an empty error list
  constructor(data = null) {
    this.data = null;
    this.errors = [];

    // Initialize the data if provided
    if (data) {
      try {
        this.data = typeof data === "object" ? JSON.stringify(data) : data;
        this.data = this.data.replace("\r", "").replace("\n", "");
        this.data = convertToDataType(this.data);
      } catch (e) {
        this.returnError(
          `Data conversion error: ${e.toString()}`,
          "DATA_CONVERSION_ERROR"
        );
      }
    }
  }

  // Method to get all the errors
  getErrors() {
    return this.errors;
  }

  // Method to handle and store errors using ParamError class
  returnError(message, code = "UNKNOWN", details = {}) {
    const error = new ParamError(message, code, details);
    this.errors.push(error);
  }

  // Main validation logic for the xAPI statements
  validate() {
    if (!this.data) {
      this.returnError("No data to validate", "EMPTY_DATA");
      return;
    }

    if (Array.isArray(this.data)) {
      const setIds = new Set();
      for (const statement of this.data) {
        if (statement.id && setIds.has(statement.id)) {
          this.returnError(
            `Duplicate ID found: ${statement.id}`,
            "DUPLICATE_ID"
          );
        }
        setIds.add(statement.id);
      }

      this.data.forEach((statement) => this.validateStatement(statement));
      return "All statements are valid";
    }

    if (typeof this.data === "object") {
      this.validateStatement(this.data);
      return "Statement is valid";
    }

    this.returnError(
      `Invalid data type for validation: ${typeof this.data}`,
      "INVALID_DATA_TYPE"
    );
  }

  // Validates email format for mbox fields
  validateEmail(email) {
    if (typeof email !== "string") {
      this.returnError("Email must be a string", "INVALID_EMAIL_TYPE");
      return;
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (
      !email.startsWith("mailto:") ||
      !emailPattern.test(email.substring(7))
    ) {
      this.returnError(
        `Invalid email format: ${email}`,
        "INVALID_EMAIL_FORMAT"
      );
    }
  }

  // Validates the language code formatting
  validateLanguage(lang, field) {
    if (typeof lang !== "string") {
      this.returnError(
        `Invalid language code in ${field}: ${lang}`,
        "INVALID_LANGUAGE_CODE"
      );
      return;
    }

    const langParts = lang.split("-");
    for (const part of langParts) {
      if (part.length > 8 || !/^[A-Za-z0-9]*$/.test(part)) {
        this.returnError(
          `Invalid language code in ${field}: ${lang}`,
          "INVALID_LANGUAGE_CODE"
        );
        return;
      }
    }
  }

  // Validates a language map against the specified field
  validateLangMap(langMap, field) {
    for (const lang in langMap) {
      this.validateLanguage(lang, field);
    }
  }

  // Validates that all values in a dictionary are non-null
  validateDictValues(dict, field) {
    for (const [key, value] of Object.entries(dict)) {
      if (!value) {
        this.returnError(
          `${field} contains a null value at ${key}`,
          "NULL_VALUE_IN_DICT"
        );
      }
    }
  }

  // Placeholder for additional statement-level validation
  // validateStatement(statement) {

  // }

  // Placeholder: Implement convertToDataType function as per your application logic

  // ... Previous JavaScript class definition

  // Validates the format of an mbox_sha1sum
  validateEmailSha1sum(sha1sum) {
    if (typeof sha1sum !== "string") {
      this.returnError(
        "mbox_sha1sum value must be a string type",
        "INVALID_SHA1SUM_TYPE"
      );
      return;
    }

    const sha1sumPattern = /^[a-fA-F0-9]{40}$/;
    if (!sha1sumPattern.test(sha1sum)) {
      this.returnError(
        `Invalid mbox_sha1sum format: ${sha1sum}`,
        "INVALID_SHA1SUM_FORMAT"
      );
    }
  }

  // Validates the format of an IRI
  validateIri(iriValue, field) {
    if (typeof iriValue !== "string") {
      this.returnError(`${field} must be a string type`, "INVALID_IRI_TYPE");
      return;
    }

    try {
      iriparse(iriValue, "IRI");
    } catch (e) {
      this.returnError(
        `${field} with value ${iriValue} is not a valid IRI`,
        "INVALID_IRI_FORMAT"
      );
    }
  }

  // Validates the format of a UUID
  validateUUID(uuid, field) {
    if (typeof uuid !== "string") {
      this.returnError(`${field} must be a string type`, "INVALID_UUID_TYPE");
      return;
    }

    try {
      const val = new UUID(uuid, 4);
      if (val.hex !== uuid) {
        this.returnError(
          `${field} - ${uuid} is not a valid UUID`,
          "INVALID_UUID_FORMAT"
        );
      }
    } catch (e) {
      this.returnError(
        `${field} - ${uuid} is not a valid UUID`,
        "INVALID_UUID_FORMAT"
      );
    }
  }

  // Validates that the given object is a dictionary
  checkIfDict(obj, field) {
    if (typeof obj !== "object" || obj === null) {
      this.returnError(
        `${field} is not a properly formatted dictionary`,
        "INVALID_DICT_FORMAT"
      );
    }
  }

  // Validates that the given object is an array
  checkIfList(obj, field) {
    if (!Array.isArray(obj)) {
      this.returnError(
        `${field} is not a properly formatted array`,
        "INVALID_ARRAY_FORMAT"
      );
    }
  }

  // Checks if an object has disallowed fields
  checkAllowedFields(allowed, obj, objName) {
    const failedList = Object.keys(obj).filter((key) => !allowed.includes(key));
    if (failedList.length > 0) {
      this.returnError(
        `Invalid field(s) found in ${objName} - ${failedList.join(", ")}`,
        "INVALID_FIELDS"
      );
    }
  }

  // Checks if an object is missing required fields
  checkRequiredFields(required, obj, objName) {
    for (const field of required) {
      if (!Object.keys(obj).includes(field)) {
        this.returnError(
          `${field} is missing in ${objName}`,
          "MISSING_REQUIRED_FIELD"
        );
      }
    }
  }

  // Validate an xAPI statement object
  validateStatement(stmt) {
    // Validate if the statement is a dictionary
    this.checkIfDict(stmt, "Statement");

    // Assuming you have defined 'statementAllowedFields' and 'statementRequiredFields' elsewhere
    this.checkAllowedFields(statementAllowedFields, stmt, "Statement");
    this.checkRequiredFields(statementRequiredFields, stmt, "Statement");

    // Validate version if present
    if ("version" in stmt) {
      if (typeof stmt.version !== "string") {
        this.returnError("Version must be a string", "INVALID_VERSION_TYPE");
      } else {
        const versionRegex = /^(1|2)\.0(\.\d+)?$/;
        if (!versionRegex.test(stmt.version)) {
          this.returnError(
            `${stmt.version} is not a supported version`,
            "UNSUPPORTED_VERSION"
          );
        }
      }
    }

    // Validate UUID if present
    // if ("id" in stmt) {
    //   this.validateUUID(stmt.id, "Statement id");
    // }

    // Validate timestamp if present
    if ("timestamp" in stmt) {
      try {
        validate_timestamp(stmt.timestamp);
        if (
          stmt.timestamp.endsWith("-00") ||
          stmt.timestamp.endsWith("-0000") ||
          stmt.timestamp.endsWith("-00:00")
        ) {
          this.returnError(
            `Timestamp error - Statement Timestamp Illegal offset ${stmt.timestamp}`,
            "ILLEGAL_TIMESTAMP_OFFSET"
          );
        }
      } catch (e) {
        this.returnError(
          `Timestamp error - Error parsing date from ${
            stmt.timestamp
          } -- Error: ${e.toString()}`,
          "INVALID_TIMESTAMP"
        );
      }
    }
  }

  // Validate an authority group object
  validateAuthorityGroup(authority) {
    if (authority.member.length !== 2) {
      this.returnError(
        "Groups representing authorities must only contain 2 members",
        "INVALID_AUTHORITY_GROUP_SIZE"
      );
    }

    const intersection = agentIfisCanOnlyBeOne.filter((value) =>
      Object.keys(authority).includes(value)
    );
    if (intersection.length > 0) {
      this.returnError(
        "Groups representing authorities must not contain an inverse functional identifier",
        "INVALID_AUTHORITY_GROUP_IFI"
      );
    }
  }

  // Validate attachments array
  validateAttachments(attachments) {
    this.checkIfList(attachments, "Attachments");

    // Assuming you have defined 'attachmentAllowedFields' and 'attachmentRequiredFields' elsewhere
    attachments.forEach((attach) => {
      this.checkAllowedFields(attachmentAllowedFields, attach, "Attachment");
      this.checkRequiredFields(attachmentRequiredFields, attach, "Attachment");

      this.validateIri(attach.usageType, "Attachments usageType");

      if ("fileUrl" in attach) {
        this.validateIri(attach.fileUrl, "Attachments fileUrl");
      }

      if (!("sha2" in attach)) {
        this.returnError(
          "Attachment sha2 is required",
          "MISSING_ATTACHMENT_SHA2"
        );
      } else {
        if (typeof attach.sha2 !== "string") {
          this.returnError(
            "Attachment sha2 must be a string",
            "INVALID_ATTACHMENT_SHA2_TYPE"
          );
        }

        const sha2Regex = /^[a-f0-9]{64}$/;
        if (!sha2Regex.test(attach.sha2)) {
          this.returnError(
            "Not a valid sha2 inside the statement",
            "INVALID_ATTACHMENT_SHA2_FORMAT"
          );
        }
      }
    });
  }

  // Custom error handling using the ParamError class
  returnError(message, code = "UNKNOWN", details = {}) {
    throw new ParamError(message, code, details);
  }
  // Validate an attachment array
  validateAttachments(attachments) {
    this.checkIfList(attachments, "Attachments");

    attachments.forEach((attach) => {
      this.checkAllowedFields(attachmentAllowedFields, attach, "Attachment");
      this.checkRequiredFields(attachmentRequiredFields, attach, "Attachment");
      // ... (Existing code for sha2, fileUrl, etc.)

      // Validate length
      if (typeof attach.length !== "number") {
        this.returnError(
          "Attachment length must be an integer",
          "INVALID_ATTACHMENT_LENGTH_TYPE"
        );
      }

      // Validate contentType
      if (typeof attach.contentType !== "string") {
        this.returnError(
          "Attachment contentType must be a string",
          "INVALID_ATTACHMENT_CONTENT_TYPE"
        );
      }

      // Validate display
      this.checkIfDict(attach.display, "Attachment display");
      this.validateLangMap(Object.keys(attach.display), "attachment display");

      // Validate description if included
      if ("description" in attach) {
        this.checkIfDict(attach.description, "Attachment description");
        this.validateLangMap(
          Object.keys(attach.description),
          "attachment description"
        );
      }
    });
  }

  // Validate a statement
  validateStatement(stmt) {
    // ... (Your previous implementation)

    // Validate 'stored' if included
    if ("stored" in stmt) {
      const stored = stmt.stored;
      try {
        validate_timestamp(stored);
      } catch (e) {
        this.returnError(
          `Stored error - Error parsing date from ${stored} -- Error: ${e.toString()}`,
          "INVALID_STORED_TIMESTAMP"
        );
      }
    }

    // Validate actor and verb
    this.validateAgent(stmt.actor, "actor");
    this.validateVerb(stmt.verb, stmt.object);

    // Validate attachments if included
    if ("attachments" in stmt) {
      this.validateAttachments(stmt.attachments);
    }
  }

  // Validate extensions
  validateExtensions(extensions, field) {
    this.checkIfDict(extensions, `${field} extensions`);
    Object.keys(extensions).forEach((key) => {
      this.validateIri(key, field);
    });
  }

  validateAgent(agent, placement) {
    this.checkIfDict(agent, `Agent in ${placement}`);
    this.checkAllowedFields(agentAllowedFields, agent, "Agent/Group");

    if (placement === "object" && !("objectType" in agent)) {
      this.returnError(
        "objectType must be set when using an Agent as the object of a statement",
        "MISSING_OBJECT_TYPE"
      );
    } else if (placement !== "object" && "objectType" in agent) {
      if (agent.objectType !== "Agent" && agent.objectType !== "Group") {
        this.returnError(
          "An agent's objectType must be either Agent or Group if given",
          "INVALID_OBJECT_TYPE"
        );
      }
    } else if (placement !== "object" && !("objectType" in agent)) {
      agent.objectType = "Agent";
    }

    let ifis = agentIfisCanOnlyBeOne.filter((ifi) => agent.hasOwnProperty(ifi));

    // Validate "objectType" and IFIs
    if (agent.objectType === "Agent" && ifis.length !== 1) {
      this.returnError(
        `One and only one of ${agentIfisCanOnlyBeOne.join(
          ", "
        )} may be supplied with an Agent`,
        "INVALID_IFI_COUNT_FOR_AGENT"
      );
    } else if (agent.objectType === "Group" && ifis.length > 1) {
      this.returnError(
        `None or one and only one of ${agentIfisCanOnlyBeOne.join(
          ", "
        )} may be supplied with a Group`,
        "INVALID_IFI_COUNT_FOR_GROUP"
      );
    }

    // Validate "name" and IFIs for Agents
    if (agent.objectType === "Agent") {
      if ("name" in agent && typeof agent.name !== "string") {
        this.returnError(
          `If name is given in Agent, it must be a string -- got ${typeof agent.name}${
            agent.name
          }`,
          "INVALID_NAME_TYPE_FOR_AGENT"
        );
      }
      this.validateIfi(ifis[0], agent[ifis[0]]); // Placeholder: implement validateIfi
    } else {
      // Validate "name" and members for Groups
      if ("name" in agent && typeof agent.name !== "string") {
        this.returnError(
          "If name is given in Group, it must be a string",
          "INVALID_NAME_TYPE_FOR_GROUP"
        );
      }

      // Validate members
      if (ifis.length === 0) {
        if (!("member" in agent)) {
          this.returnError(
            "Anonymous groups must contain member",
            "MISSING_MEMBER_IN_ANONYMOUS_GROUP"
          );
        } else {
          this.validateMembers(agent); // Placeholder: implement validateMembers
        }
      } else {
        this.validateIfi(ifis[0], agent[ifis[0]]); // Placeholder: implement validateIfi
        if ("member" in agent) {
          this.validateMembers(agent); // Placeholder: implement validateMembers
        }
      }
    }
  }

  // ... Implement or add the rest of the missing methods like validate_ifi, validate_members, etc.

  // Placeholder: Implement or import the remaining necessary functions and variables like validate_ifi, validate_members, agentIfisCanOnlyBeOne, and agentAllowedFields.

  // ... Previous JavaScript class definition

  /**
   * Validate the members of an agent group.
   */
  validateMembers(agent) {
    const { member: members } = agent;
    if (!Array.isArray(members) || members.length === 0) {
      throw new ParamError("Member property must contain agents");
    }
    members.forEach((member) => this.validateAgent(member, "member"));
  }

  /**
   * Validate an Inverse Functional Identifier (IFI).
   */
  validateIfi(ifis, ifiValue) {
    switch (ifis) {
      case "mbox":
        this.validateEmail(ifiValue);
        break;
      case "mbox_sha1sum":
        this.validateSha1Sum(ifiValue);
        break;
      case "openid":
        this.validateIri(ifiValue, "openid");
        break;
      case "account":
        this.validateAccount(ifiValue);
        break;
      default:
        throw new ParamError(`Invalid IFI type: ${ifis}`);
    }
  }

  /**
   * Validate an Account object in an Agent.
   */
  validateAccount(account) {
    this.checkAllowedFields(accountAllowedFields, account, "Account");
    this.checkRequiredFields(accountRequiredFields, account, "Account");
    this.validateIri(account.homePage, "homePage");
    if (typeof account.name !== "string") {
      throw new ParamError("Account name must be a string");
    }
  }

  /**
   * Validate the Verb part of an xAPI statement.
   */
  validateVerb(verb, stmtObject = null) {
    this.checkAllowedFields(verbAllowedFields, verb, "Verb");
    const { id, display } = verb;
    if (!id) {
      throw new ParamError("Verb must contain an id");
    }
    this.validateIri(id, "Verb id");
    if (display) {
      this.validateLangMap(Object.keys(display), "verb display");
      this.validateDictValues(Object.values(display), "verb display");
    }
  }

  /**
   * Validate the Object part of an xAPI statement.
   */
  validateObject(stmtObject) {
    const { objectType } = stmtObject;
    switch (objectType) {
      case "Activity":
      case undefined:
        this.validateActivity(stmtObject);
        break;
      case "Agent":
      case "Group":
        this.validateAgent(stmtObject, "object");
        break;
      case "SubStatement":
        this.validateSubStatement(stmtObject);
        break;
      case "StatementRef":
        this.validateStatementRef(stmtObject);
        break;
      default:
        throw new ParamError(
          `The objectType in the statement's object is not valid - ${objectType}`
        );
    }
  }

  /**
   * Validate a StatementRef object.
   */
  validateStatementRef(ref) {
    this.checkAllowedFields(refFields, ref, "StatementRef");
    this.checkRequiredFields(refFields, ref, "StatementRef");
    const { objectType, id } = ref;
    if (objectType !== "StatementRef") {
      throw new ParamError(
        "StatementRef objectType must be set to 'StatementRef'"
      );
    }
    this.validateUuid(id, "StatementRef id");
  }

  // ... Add or implement the remaining placeholder methods like validate_email, validate_email_sha1sum, etc.

  // Placeholder: Implement or import the remaining necessary functions and variables like validate_email, validate_email_sha1sum, refFields, and accountFields.

  // ... Continuing from the previous JavaScript class definition

  /**
   * Validate an Activity object.
   */
  validateActivity(activity) {
    this.checkIfDict(activity, "Activity");
    this.checkAllowedFields(activityAllowedFields, activity, "Activity");

    if (!("id" in activity)) {
      this.returnError("Id field must be present in an Activity");
    }

    this.validateIri(activity.id, "Activity id");

    if ("definition" in activity) {
      this.validateActivityDefinition(activity.definition);
    }
  }

  /**
   * Validate an Activity definition object.
   */
  validateActivityDefinition(definition) {
    this.checkIfDict(definition, "Activity definition");
    this.checkAllowedFields(
      activityDefinitionAllowedFields,
      definition,
      "Activity definition"
    );

    if ("name" in definition) {
      this.checkIfDict(definition.name, "Activity definition name");
      this.validateLangMap(
        Object.keys(definition.name),
        "activity definition name"
      );
    }

    if ("description" in definition) {
      this.checkIfDict(
        definition.description,
        "Activity definition description"
      );
      this.validateLangMap(
        Object.keys(definition.description),
        "activity definition description"
      );
    }

    if ("type" in definition) {
      this.validateIri(definition.type, "Activity definition type");
    }

    if ("moreInfo" in definition) {
      this.validateIri(definition.moreInfo, "Activity definition moreInfo");
    }

    let interactionType = null;
    if ("interactionType" in definition) {
      if (typeof definition.interactionType !== "string") {
        this.returnError(
          "Activity definition interactionType must be a string"
        );
      }

      const scormInteractionTypes = [
        "true-false",
        "choice",
        "fill-in",
        "long-fill-in",
        "matching",
        "performance",
        "sequencing",
        "likert",
        "numeric",
        "other",
      ];

      if (!scormInteractionTypes.includes(definition.interactionType)) {
        this.returnError(
          `Activity definition interactionType ${definition.interactionType} is not valid`
        );
      }

      interactionType = definition.interactionType;
    }

    if ("correctResponsesPattern" in definition) {
      if (!interactionType) {
        this.returnError(
          "interactionType must be given when correctResponsesPattern is used"
        );
      }
      this.checkIfList(
        definition.correctResponsesPattern,
        "Activity definition correctResponsesPattern"
      );

      for (const answer of definition.correctResponsesPattern) {
        if (typeof answer !== "string") {
          this.returnError(
            "Activity definition correctResponsesPattern answers must all be strings"
          );
        }
      }
    }

    const interaction_components = [
      "choices",
      "scale",
      "source",
      "target",
      "steps",
    ];
    if (
      interaction_components.some((key) => key in definition) &&
      !interactionType
    ) {
      this.return_error(
        "interactionType must be given when using interaction components"
      );
    }

    this.validate_interaction_types(interactionType, definition);

    if ("extensions" in definition) {
      this.validate_extensions(
        definition["extensions"],
        "activity definition extensions"
      );
    }
  }

  check_other_interaction_component_fields(allowed, definition) {
    // Check if other interaction component fields are included when they shouldn't be.
    const interaction_components = new Set([
      "choices",
      "scale",
      "source",
      "target",
      "steps",
    ]);
    const keys = new Set(Object.keys(definition));

    const both = new Set(
      [...interaction_components].filter((x) => keys.has(x))
    );
    const not_allowed = new Set([...both].filter((x) => !allowed.has(x)));

    if (not_allowed.size > 0) {
      this.return_error(
        `Only interaction component field(s) allowed (${Array.from(
          allowed
        ).join(", ")}) - not allowed: ${Array.from(not_allowed).join(", ")}`
      );
    }
  }

  // ... Placeholder for additional methods like validate_interaction_types, validate_extensions, etc.

  // Placeholder: Implement or import the remaining necessary functions and variables like activityAllowedFields, activityAllowedFields, validate_interaction_types, validate_extensions, etc.

  // ... Continuing from the previous JavaScript class definition

  // Validate interaction types in an xAPI statement
  validateInteractionTypes(interactionType, definition) {
    if (
      ["choice", "sequencing", "likert", "matching", "performance"].includes(
        interactionType
      )
    ) {
      if (!definition.hasOwnProperty(interactionType)) {
        this.throwParamError(
          `Missing ${interactionType} in definition.`,
          `MISSING_${interactionType.toUpperCase()}`
        );
      }
      this.validateInteractionActivities(
        definition[interactionType],
        interactionType
      );
    } else {
      this.throwParamError(
        `Invalid interaction type: ${interactionType}`,
        "INVALID_INTERACTION_TYPE"
      );
    }
  }

  // Validate the activities in an interaction component
  validateInteractionActivities(activities, field) {
    const idList = [];
    if (!Array.isArray(activities)) {
      this.throwParamError(
        `Activities must be an array for field ${field}.`,
        "INVALID_ACTIVITIES_TYPE"
      );
    }

    activities.forEach((activity) => {
      if (typeof activity.id !== "string") {
        this.throwParamError(
          `Interaction activity in component ${field} has an id that is not a string`,
          "INVALID_ID_TYPE",
          { component: field }
        );
      }
      idList.push(activity.id);
    });

    // Verify no duplicate IDs exist
    const idSet = new Set(idList);
    if (idSet.size !== idList.length) {
      this.throwParamError(
        "Duplicate IDs found in activities.",
        "DUPLICATE_IDS"
      );
    }
  }

  // Validate extensions field in an xAPI statement
  validateExtensions(extensions, description) {
    // Implement your logic for validating extensions here.
    // For demonstration, assume that extensions should be an object
    if (typeof extensions !== "object") {
      this.throwParamError(
        `Invalid type for ${description}. Must be an object.`,
        "INVALID_EXTENSIONS_TYPE"
      );
    }
  }

  // Validate the activity definition in an xAPI statement
  validateActivityDefinition(definition) {
    const interactionType = definition.interactionType;

    const interactionComponents = [
      "choices",
      "scale",
      "source",
      "target",
      "steps",
    ];
    if (
      interactionComponents.some((key) => key in definition) &&
      !interactionType
    ) {
      this.throwParamError(
        "interactionType must be given when using interaction components",
        "MISSING_INTERACTION_TYPE"
      );
    }

    this.validateInteractionTypes(interactionType, definition);

    if ("extensions" in definition) {
      this.validateExtensions(
        definition.extensions,
        "activity definition extensions"
      );
    }
  }

  // ... Placeholder for additional utility methods like check_if_dict, check_allowed_fields, validate_timestamp, etc.

  // Placeholder: Implement or import the remaining necessary functions and variables like intActFields, subAllowedFields, subRequiredFields, validate_timestamp, etc.

  // ... Continuing from the previous JavaScript class definition

  /**
   * Validates the structure of a sub-statement, including its actor, object, verb, result, and context.
   * @param {Object} substmt - The sub-statement to validate.
   */
  validateSubstatement(substmt) {
    this.validateAgent(substmt.actor, "actor");
    this.validateObject(substmt.object);
    this.validateVerb(substmt.verb);

    if ("result" in substmt) {
      this.validateResult(substmt.result);
    }

    if ("context" in substmt) {
      this.validateContext(substmt.context, substmt.object);
    }
  }

  /**
   * Validates the "result" part of a statement, including the duration.
   * @param {Object} result - The result object to validate.
   */
  validateResult(result) {
    this.checkIfDict(result, "Result");
    this.checkAllowedFields(resultAllowedFields, result, "Result");

    const durationRegex =
      /^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

    if ("duration" in result) {
      if (!durationRegex.test(result.duration)) {
        throw new ParamError("Error with result duration");
      }
    }
  }

  /**
   * Validates the "score" part of a result, including its raw, min, and max values.
   * @param {Object} score - The score object to validate.
   */
  validateScore(score) {
    this.checkIfDict(score, "Score");
    this.checkAllowedFields(scoreAllowedFields, score, "Score");

    let raw = null;
    if ("raw" in score) {
      raw = score.raw;
      if (typeof raw !== "number") {
        throw new ParamError("Score raw is not a number");
      }
    }

    if ("min" in score && "max" in score) {
      const min = score.min;
      const max = score.max;

      if (typeof min !== "number" || typeof max !== "number") {
        throw new ParamError("Score min or max is not a number");
      }

      if (min >= max) {
        throw new ParamError("Score minimum must be less than the maximum");
      }

      if (raw !== null && (raw < min || raw > max)) {
        throw new ParamError("Score raw value must be between min and max");
      }
    }
  }

  /**
   * Validates the "context" part of a statement.
   * @param {Object} context - The context object to validate.
   * @param {Object} stmtObject - The main object of the statement, used for additional validation.
   */
  validateContext(context, stmtObject) {
    this.checkIfDict(context, "Context");
    this.checkAllowedFields(contextAllowedFields, context, "Context");

    if ("registration" in context) {
      this.validateUUID(context.registration, "Context registration");
    }

    if ("instructor" in context) {
      this.validateAgent(context.instructor, "Context instructor");
    }

    if ("team" in context) {
      this.validateAgent(context.team, "Context team");
      if (
        !("objectType" in context.team) ||
        context.team.objectType === "Agent"
      ) {
        throw new ParamError("Team in context must be a group");
      }
    }
  }

  /**
   * Validates the "contextActivities" part of a context.
   * @param {Object} conacts - The context activities to validate.
   */
  validateContextActivities(conacts) {
    this.checkIfDict(conacts, "Context activity");
    const contextActivityTypes = ["parent", "grouping", "category", "other"];

    for (const [key, value] of Object.entries(conacts)) {
      if (!contextActivityTypes.includes(key)) {
        throw new ParamError(`Invalid context activity type: ${key}`);
      }

      if (Array.isArray(value)) {
        value.forEach((activity) => {
          this.validateActivity(activity);
        });
      } else if (typeof value === "object") {
        this.validateActivity(value);
      } else {
        throw new ParamError("contextActivities is not formatted correctly");
      }
    }
  }

  /**
   * Validates the "contextAgents" part of a context.
   * @param {Array} conags - The context agents to validate.
   */
  validateContextAgents(conags) {
    this.checkIfList(conags, "Context Agents");

    conags.forEach((agent) => {
      if (!("objectType" in agent)) {
        throw new ParamError("Context Agent entries must have an objectType");
      }
      // Additional validation logic here, if needed
    });
  }

  /**
   * Validates the "contextGroups" part of a context.
   * @param {Array} congrps - The context groups to validate.
   */
  validateContextGroups(congrps) {
    this.checkIfList(congrps, "Context Groups");

    congrps.forEach((group) => {
      if (!("objectType" in group)) {
        throw new ParamError("Context Group entries must have an objectType");
      }
      // Additional validation logic here, if needed
    });
  }
}

// Your existing code to initialize someSubstatement should go here
var someSubstatement = {
  actor: "Empress",
  verb: {
    id: "http://adlnet.gov/expapi/verbs/attempted",
    display: { "en-US": "attempted" },
  },
  object: "LLC",
};

// Create a validator instance and validate your statement
var validator = new StatementValidator();

// Instead of try-catch, you directly call your validation methods
validator.validateVerb(someSubstatement.verb); // Just an example; use actual methods
// ... (other validations)

// Fetch the errors after validation
var errors = validator.getErrors();

if (errors.length > 0) {
  // Handle errors here
  console.log(
    "Validation failed with the following errors:",
    errors.map((e) => e.toString())
  );
} else {
  // Continue processing, no validation errors
  console.log("Validation successful.");
}

// At the end of your file
module.exports = { StatementValidator };
