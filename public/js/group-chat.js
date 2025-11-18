      // Global variables
      let currentGroupId = null;
      let currentUserId = null;
      let currentUserName = null;
      let socket = null;
      let isAdmin = false;
      let groups = [];
      let previousGroupId = null;
      let onlineUsersInRoom = 0;

      // Get the api url
      async function getApiUrl() {
        try {
          const response = await fetch("/api/config");
          const data = await response.json();
          return data.apiUrl;
        } catch (error) {
          console.error("Error getting API URL:", error);
          return "http://localhost:3000"; // fallback
        }
      }


      function parseJwt(token) {
        try {
          var base64Url = token.split(".")[1];
          var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          var jsonPayload = decodeURIComponent(
            window
              .atob(base64)
              .split("")
              .map(function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
              })
              .join("")
          );
          return JSON.parse(jsonPayload);
        } catch (error) {
          console.error("Error parsing JWT:", error);
          return null;
        }
      }

      // Helper function to format time
      function formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const messageDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );

        if (messageDate.getTime() === today.getTime()) {
          // Today - show time
          return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
        } else if (
          messageDate.getTime() ===
          today.getTime() - 24 * 60 * 60 * 1000
        ) {
          // Yesterday
          return "Yesterday";
        } else {
          // Older - show date
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        }
      }

      // Initialize Socket.IO - FIXED VERSION
      function initializeSocket() {
        // Don't create multiple socket connections
        if (socket && socket.connected) {
          console.log("Socket already connected");
          return;
        }

        socket = io({
          path: "/socket.io",
          transports: ["websocket", "polling"],
          forceNew: true, // Ensure fresh connection
        });

        socket.on("connect", () => {
          console.log("Connected to server:", socket.id);
          onlineUsersInRoom++;
          // Join current group room if we have one
          if (currentGroupId) {
            console.log("Auto-joining room on connect:", currentGroupId);
            socket.emit("joinRoom", currentGroupId);
          }
        });

        socket.on("receivedMsg", (msg) => {
          console.log(
            "Received message for group:",
            msg.groupId,
            "Current group:",
            currentGroupId
          );

          // CRITICAL: Only display message if it's for the current active group
          if (msg.groupId == currentGroupId) {
            displayMessage(msg);
          } else {
            console.log("Ignoring message for different group");
          }
        });

        socket.on("disconnect", () => {
          onlineUsersInRoom--;
          console.log("Disconnected from server");
        });

        // Handle reconnection
        socket.on("reconnect", () => {
          console.log("Reconnected to server");
          if (currentGroupId) {
            socket.emit("joinRoom", currentGroupId);
          }
        });

        socket.on("updateOnlineCount", (count) => {
          onlineUsersInRoom = count;
          document.getElementById("chatStatus").textContent =
            onlineUsersInRoom > 0 ? `${onlineUsersInRoom} Online` : "";
      });
      }

      // Initialize the application
      async function initializeApp() {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            window.location.href = "login.html";
            return;
          }

          const decodedToken = parseJwt(token);
          if (!decodedToken) {
            localStorage.removeItem("token");
            window.location.href = "login.html";
            return;
          }

          currentUserId = decodedToken.id;
          currentUserName = decodedToken.name;

          // Update user info in sidebar
          document.getElementById("userName").textContent = currentUserName;
          document.getElementById("userAvatar").textContent = currentUserName
            .charAt(0)
            .toUpperCase();

          // Initialize socket ONCE
          initializeSocket();

          // Load groups
          await loadUserGroups();

          // Check if there's a selected group from localStorage
          const selectedGroupId = localStorage.getItem("groupid");
          if (selectedGroupId) {
            // Wait a bit for socket to connect
            setTimeout(() => {
              selectGroupById(selectedGroupId);
            }, 500);
          }
        } catch (error) {
          console.error("Error initializing app:", error);
          showError("Failed to initialize application");
        }
      }

      // Load user groups
      async function loadUserGroups() {
        try {
          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          const response = await axios.get(
            `${apiUrl}/group/group-list/${currentUserId}`,
            {
              headers: { Authorization: token },
            }
          );

          groups = response.data.list || [];
          renderGroupsList();
        } catch (error) {
          console.error("Error loading groups:", error);
          showError("Failed to load groups");
        }
      }

      // Render groups list
      function renderGroupsList() {
        const container = document.getElementById("groupsList");

        if (groups.length === 0) {
          container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-users"></i></div>
          <div class="empty-state-text">No groups yet</div>
          <div style="margin-top: 12px;"></div>
          <button class="btn" onclick="showNewGroupModal()">Create your first group</button>
        </div>
      `;
          return;
        }

        container.innerHTML = groups;

        const messages = JSON.parse(localStorage.getItem("messages") || "[]");

        container.innerHTML = groups
          .map((group) => {
            // Get messages for this group
            const groupMessages = messages.filter(
              (msg) => msg.groupId == group.id
            );

            // Get the last message
            const lastMessage =
              groupMessages.length > 0
                ? groupMessages[groupMessages.length - 1]
                : null;

            const lastMessageText = lastMessage
              ? lastMessage.message
              : "No messages yet";

            const lastMessageTime = lastMessage
              ? formatTime(lastMessage.createdAt)
              : "";
            console.log("Last message time:", group);
            return `
        <div class="group-item ${currentGroupId == group.id ? "active" : ""}" 
             onclick="selectGroup(this, '${group.id}','${group.groupName}')">
          <div class="group-avatar">${group.groupName
            .charAt(0)
            .toUpperCase()}</div>
          <div class="group-info">
            <div class="group-name">${group.groupName}</div>
            <div class="group-last-message">${lastMessageText}</div>
          </div>
          <div class="group-meta">${lastMessageTime}</div>
        </div>
      `;
          })
          .join("");
      }
      
      // Select a group - COMPLETELY FIXED VERSION
      function selectGroup(element, groupId, groupName) {
        //debugger;

        // Leave previous room if we were in one
        if (
          socket &&
          socket.connected &&
          previousGroupId &&
          previousGroupId !== groupId
        ) {
          console.log("Leaving previous room:", previousGroupId);
          socket.emit("leaveRoom", previousGroupId);
        }

        // Remove active class from all groups
        document.querySelectorAll(".group-item").forEach((item) => {
          item.classList.remove("active");
        });

        // Add active class to selected group
        element.classList.add("active");

        // Update group tracking
        previousGroupId = currentGroupId;
        currentGroupId = groupId;

        // Store in localStorage
        localStorage.setItem("groupid", groupId);
        localStorage.setItem("groupName", groupName);

        // Join the new room via socket
        if (socket && socket.connected) {
          console.log("Joining new room:", groupId);
          socket.emit("joinRoom", groupId);
        } else {
          console.warn("Socket not connected when trying to join room");
        }

        // Update UI
        document.getElementById("currentGroupName").textContent = groupName;
        // document.getElementById("chatStatus").textContent =
        //   onlineUsersInRoom > 0 ? `${onlineUsersInRoom} Online` : "";

        console.log("Current user :", groupName, groupId);
        // Show chat interface
        document.getElementById("noGroupSelected").style.display = "none";
        document.getElementById("chatInterface").style.display = "flex";

        // Load messages for this group
        loadMessages();

        // Check admin status and update invite link
        checkAdminStatus();
      }

      // Select group by ID (used when loading from localStorage)
      function selectGroupById(groupId) {
        const groupItem = document.querySelector(`[onclick*="${groupId}"]`);
        if (groupItem) {
          const group = groups.find((g) => g.id == groupId);
          if (group) {
            selectGroup(groupItem, groupId, group.groupName);
          }
        }
      }

      // Check admin status
      async function checkAdminStatus() {
        try {
          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          const response = await axios.get(
            `${apiUrl}/admin/checkadmin/${currentUserId}/${currentGroupId}`,
            {
              headers: { Authorization: token },
            }
          );

          isAdmin = response.data.admin && response.data.admin.isAdmin === true;

          // Show invite link if admin
          if (isAdmin) {
            const inviteLink = `${apiUrl}/signup.html?groupId=${currentGroupId}`;
            localStorage.setItem("link", inviteLink);

            // document.getElementById("inviteLink").style.display = "block";
            // document.getElementById("inviteLinkText").textContent = inviteLink;
          } else {
            document.getElementById("inviteLink").style.display = "none";
            localStorage.removeItem("link");
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          isAdmin = false;
        }
      }

      // Load messages for current group - FIXED IMPLEMENTATION
      async function loadMessages() {
        try {
          // Clear existing messages
          document.getElementById("messagesContainer").innerHTML = "";

          console.log("Loading messages for group ID:", currentGroupId);

          // Load messages from localStorage first
          const messages = JSON.parse(localStorage.getItem("messages")) || [];
          let lastMsgId = 0;

          // Filter and display messages for current group
          const groupMessages = messages.filter(
            (msg) => msg.groupId == currentGroupId
          );

          groupMessages.forEach((msg) => {
            displayMessage(msg, false); // Don't save to localStorage again
            lastMsgId = Math.max(lastMsgId, msg.id || 0);
          });

          // Load new messages from server if we have a lastMsgId
          if (lastMsgId > 0) {
            await getNewMessages(lastMsgId);
          }

          // let chatStatus = document.getElementById("chatStatus");
          // chatStatus.textContent =
          //   onlineUsersInRoom > 0
          //     ? `${onlineUsersInRoom} Online`
          //     : "No users online";
        } catch (error) {
          console.error("Error loading messages:", error);
          document.getElementById("chatStatus").textContent =
            "Error loading messages";
        }
      }

      // Get new messages from server - FIXED IMPLEMENTATION
      async function getNewMessages(lastMsgId) {
        try {
          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          console.log(
            `Fetching messages after ID ${lastMsgId} for group ${currentGroupId}`
          );

          const response = await axios.get(
            `${apiUrl}/message/get-message/${lastMsgId}/${currentGroupId}`,
            {
              headers: { Authorization: token },
            }
          );

          if (
            response.data.message !== "No messages found" &&
            response.data.message
          ) {
            response.data.message.forEach((msg) => {
              displayMessage(msg, true); // Save to localStorage
            });
          }
        } catch (error) {
          console.error("Error getting new messages:", error);
        }
      }

      // Display a message in the chat - IMPROVED IMPLEMENTATION
      function displayMessage(messageData, saveToStorage = true) {
        const container = document.getElementById("messagesContainer");
        const messageDiv = document.createElement("div");

        const isOwn = messageData.userId == currentUserId;
        // messageDiv.className = `message ${isOwn ? 'message-sent' : 'message-received'}`;
        messageDiv.className = `message ${isOwn ? "own" : ""}`;

        const senderName = isOwn ? "You" : messageData.memberName;
        const avatar = isOwn
          ? currentUserName.charAt(0).toUpperCase()
          : messageData.memberName
          ? messageData.memberName.charAt(0).toUpperCase()
          : "U";

        // Check if message is an image link
        const isImage = messageData.message.match(
          /\.(jpeg|jpg|png|gif|webp|bmp|svg)$/i
        );
        const isFileLink =
          messageData.message.startsWith("http") &&
          !messageData.message.includes(" ");
        const isVideo = messageData.message.match(
          /\.(mp4|webm|ogg|mov|avi|mkv)$/i
        );

        let bubbleContent;
        if (isImage) {
          bubbleContent = `<img src="${messageData.message}" alt="image" class="message-image" />`;
        } else if (isVideo) {
          bubbleContent = `<video controls class="message-video" style="width:25rem; height:15rem;"><source src="${messageData.message}" type="video/mp4">Your browser does not support the video tag.</video>`;
        } else if (isFileLink) {
          bubbleContent = `<a href="${
            messageData.message
          }" target="_blank" class="message-file"><p>${messageData.message
            .split("/")
            .pop()}</p>Download File</a>`;
        } else {
          bubbleContent = formatRichText(messageData.message);
        }

        messageDiv.innerHTML = `
                <div class="message-avatar">${avatar}</div>
                <div class="message-content">
                    <div class="message-bubble">${bubbleContent}</div>
                    <div class="message-info">${senderName} • ${formatTime(
          messageData.createdAt
        )}</div>
                </div>
            `;

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;

        // Save to localStorage if requested
        if (saveToStorage) {
          let messages = JSON.parse(localStorage.getItem("messages")) || [];
          const existingMessage = messages.find((m) => m.id === messageData.id);

          if (!existingMessage) {
            messages.push(messageData);
            localStorage.setItem("messages", JSON.stringify(messages));
          }
        }
      }

      function formatRichText(text) {
        // Bold **text**
        text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        // Italic *text*
        text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
        // Replace line breaks with <br>
        text = text.replace(/\n/g, "<br>");
        return text;
      }
      // Send message - ENHANCED VERSION
      async function sendMessage(event) {
        event.preventDefault();

        try {
          const input = document.getElementById("messageInput");
          const message = input.value.trim();

          if (!message || !currentGroupId) {
            console.warn("No message or group selected");
            return;
          }

          // Verify we're connected to socket and in the right room
          if (!socket || !socket.connected) {
            showError("Not connected to server. Please refresh the page.");
            return;
          }

          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          const msgDetails = {
            id: currentUserId,
            name: currentUserName,
            message: message,
            groupId: currentGroupId, // Ensure groupId is included
          };

          console.log("Sending message to group:", currentGroupId, msgDetails);

          const response = await axios.post(
            `${apiUrl}/message/post-message/${currentGroupId}`,
            msgDetails,
            {
              headers: { Authorization: token },
            }
          );

          console.log("Message sent, server response:", response.data);

          // Emit to socket with proper room targeting
          if (socket && socket.connected) {
            const messageToEmit = {
              ...response.data.messageDetails,
              groupId: currentGroupId, // Ensure groupId is set
            };

            console.log(
              "Emitting message to room:",
              currentGroupId,
              messageToEmit
            );
            socket.emit("message", messageToEmit);
          } else {
            console.error("Socket not connected when trying to send message");
            showError(
              "Message sent but may not appear for others. Connection issue."
            );
          }

          // Clear input
          input.value = "";
        } catch (error) {
          console.error("Error sending message:", error);
          showError("Failed to send message");
        }
      }

      async function handleFileSelect(event) {
        try {
          const file = event.target.files[0];
          if (!file || !currentGroupId) return;

          const formData = new FormData();
          formData.append("myfile", file);

          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          const response = await axios.post(
            `${apiUrl}/file/filestored/${currentGroupId}`,
            formData,
            {
              headers: {
                Authorization: token,
                "Content-Type": "multipart/form-data",
              },
            }
          );

          // Set the message input with file info
          // document.getElementById("messageInput").value =
          //   response.data.msg.message;

          // Emit to socket
          if (socket) {
            socket.emit("message", response.data.msg);
          }
        } catch (error) {
          console.error("Error uploading file:", error);
          showError("Failed to upload file");
        }
      }

      // Load group details
      async function loadGroupDetails() {
        try {
          if (!currentGroupId) return;

          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          // Update group banner
          const groupName = localStorage.getItem("groupName") || "Group";
          document.getElementById("groupBannerTitle").textContent = groupName;
          document.getElementById("groupBannerAvatar").textContent = groupName
            .charAt(0)
            .toUpperCase();

          // Load members
          await loadGroupMembers();

          // Load files
          await loadGroupFiles();

          await // Load action buttons
          loadGroupActions();
        } catch (error) {
          console.error("Error loading group details:", error);
        }
      }

      // Load group members
      async function loadGroupMembers() {
        try {
          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          const response = await axios.get(
            `${apiUrl}/group/memberlist/${currentGroupId}`,
            {
              headers: { Authorization: token },
            }
          );

          const members = response.data.list || [];
          const membersContainer = document.getElementById("membersList");
          membersContainer.innerHTML = "";

          // Update member count
          document.getElementById("memberCount").textContent = members.length;
          document.getElementById("onlineCount").textContent = onlineUsersInRoom;

          for (const member of members) {
            // Check if member is admin
            const adminCheck = await axios.get(
              `${apiUrl}/admin/checkadmin/${member.id}/${currentGroupId}`,
              {
                headers: { Authorization: token },
              }
            );

            const memberIsAdmin =
              adminCheck.data.admin && adminCheck.data.admin.isAdmin === true;

            const memberDiv = document.createElement("div");
            memberDiv.className = "member-item";

            const memberAvatar = member.name.charAt(0).toUpperCase();

            memberDiv.innerHTML = `
            <div style="display:flex; gap:10px; align-items:center;">
              <div class="member-avatar">
                ${memberAvatar}
                <div class="member-status"></div>
              </div>
              <div class="member-info">
                <div class="member-name">${member.name}</div>
                <div class="member-role">${member.email}</div>
              </div>
            </div>
              ${memberIsAdmin ? '<div class="admin-badge">Admin</div>' : ""}
            `;

            // Add admin actions if current user is admin
            if (isAdmin && member.id != currentUserId) {
              const actionsDiv = document.createElement("div");
              actionsDiv.className = "member-actions";

              if (memberIsAdmin) {
                actionsDiv.innerHTML = `
                  <button class="member-action-btn secondary" onclick="removeAdmin('${member.id}')">
                    Remove Admin
                  </button>
                  <button class="member-action-btn danger" onclick="removeMember('${member.id}')">
                    Remove
                  </button>
                `;
              } else {
                actionsDiv.innerHTML = `
                  <button class="member-action-btn success" onclick="makeAdmin('${member.id}')">
                    Make Admin
                  </button>
                  <button class="member-action-btn danger" onclick="removeMember('${member.id}')">
                    Remove
                  </button>
                `;
              }

              memberDiv.appendChild(actionsDiv);
            }

            membersContainer.appendChild(memberDiv);
          }
        } catch (error) {
          console.error("Error loading members:", error);
        }
      }

      // Load group files
      async function loadGroupFiles() {
        try {
          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          const response = await axios.get(
            `${apiUrl}/file/getfiles/${currentGroupId}`,
            {
              headers: { Authorization: token },
            }
          );

          const files = response.data || [];
          const filesContainer = document.getElementById("filesList");
          filesContainer.innerHTML = "";

          if (files.length === 0) {
            filesContainer.innerHTML = `
              <div class="empty-state">
                <div class="empty-state-icon">
                  <i class="fas fa-file"></i>
                </div>
                <div class="empty-state-text">No files shared yet</div>
              </div>
            `;
            return;
          }

          files.forEach((file) => {
            const fileDiv = document.createElement("div");
            fileDiv.className = "file-item";

            const fileName = file.url.split("/").pop() || "Unknown file";

            fileDiv.innerHTML = `
              <div class="file-icon">
                <i class="fas fa-file"></i>
              </div>
              <div class="file-info">
                <div class="file-name">${fileName}</div>
                <div class="file-meta">Click to download</div>
              </div>
            `;

            fileDiv.onclick = () => window.open(file.url, "_blank");
            filesContainer.appendChild(fileDiv);
          });
        } catch (error) {
          console.error("Error loading files:", error);
        }
      }

      // Load group actions
      function loadGroupActions() {
        const actionsContainer = document.getElementById("actionButtons");
        actionsContainer.innerHTML = "";

        // Copy invite link (admin only)
        if (isAdmin) {
          const inviteBtn = document.createElement("button");
          inviteBtn.className = "action-btn secondary";
          inviteBtn.innerHTML = '<i class="fas fa-link"></i> Copy Invite Link';
          inviteBtn.onclick = copyInviteLink;
          actionsContainer.appendChild(inviteBtn);

          // Delete group (admin only)
          const deleteBtn = document.createElement("button");
          deleteBtn.className = "action-btn danger";
          deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Group';
          deleteBtn.onclick = deleteGroup;
          actionsContainer.appendChild(deleteBtn);
        }

        // Exit group
        const exitBtn = document.createElement("button");
        exitBtn.className = "action-btn danger";
        exitBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Leave Group';
        exitBtn.onclick = exitGroup;
        actionsContainer.appendChild(exitBtn);
      }

      // Admin functions
      async function makeAdmin(memberId) {
        try {
          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          await axios.get(
            `${apiUrl}/admin/makeadmin/${memberId}/${currentGroupId}`,
            {
              headers: { Authorization: token },
            }
          );

          alert("Member made admin successfully");
          await loadGroupMembers();
        } catch (error) {
          console.error("Error making admin:", error);
          showError("Failed to make member admin");
        }
      }

      async function removeAdmin(memberId) {
        try {
          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          await axios.get(
            `${apiUrl}/admin/removeadmin/${memberId}/${currentGroupId}`,
            {
              headers: { Authorization: token },
            }
          );

          alert("Admin removed successfully");
          await loadGroupMembers();
        } catch (error) {
          console.error("Error removing admin:", error);
          showError("Failed to remove admin");
        }
      }

      async function removeMember(memberId) {
        if (!confirm("Are you sure you want to remove this member?")) return;

        try {
          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          await axios.get(
            `${apiUrl}/admin/removeuser/${memberId}/${currentGroupId}`,
            {
              headers: { Authorization: token },
            }
          );

          alert("Member removed successfully");
          await loadGroupMembers();
        } catch (error) {
          console.error("Error removing member:", error);
          showError("Failed to remove member");
        }
      }

      // Group management functions
      async function exitGroup() {
        if (!confirm("Are you sure you want to leave this group?")) return;

        try {
          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          await axios.get(
            `${apiUrl}/group/exitgroup/${currentUserId}/${currentGroupId}`,
            {
              headers: { Authorization: token },
            }
          );

          alert("You have left the group");

          // Clear localStorage and reload
          localStorage.removeItem("groupid");
          localStorage.removeItem("groupName");
          localStorage.removeItem("link");

          await loadUserGroups();

          // Hide chat interface
          document.getElementById("chatInterface").style.display = "none";
          document.getElementById("noGroupSelected").style.display = "flex";
          closeDetailsPanel();
        } catch (error) {
          console.error("Error leaving group:", error);
          showError("Failed to leave group");
        }
      }

      async function deleteGroup() {
        if (
          !confirm(
            "Are you sure you want to delete this group? This action cannot be undone."
          )
        )
          return;

        try {
          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          await axios.get(`${apiUrl}/admin/deletegroup/${currentGroupId}`, {
            headers: { Authorization: token },
          });

          alert("Group deleted successfully");

          // Clear localStorage and reload
          localStorage.removeItem("groupid");
          localStorage.removeItem("groupName");
          localStorage.removeItem("link");

          await loadUserGroups();

          // Hide chat interface
          document.getElementById("chatInterface").style.display = "none";
          document.getElementById("noGroupSelected").style.display = "flex";
          closeDetailsPanel();
        } catch (error) {
          console.error("Error deleting group:", error);
          showError("Failed to delete group");
        }
      }

      // Utility functions
      function copyInviteLink() {
        const link = localStorage.getItem("link");
        if (link) {
          navigator.clipboard
            .writeText(link)
            .then(() => {
              alert("Invite link copied to clipboard!");
            })
            .catch((err) => {
              console.error("Error copying link:", err);
              prompt("Copy this link:", link);
            });
        }
      }

      function filterGroups() {
        const search = document
          .getElementById("groupSearch")
          .value.toLowerCase();
        const groupItems = document.querySelectorAll(".group-item");

        groupItems.forEach((item) => {
          const groupName = item
            .querySelector(".group-name")
            .textContent.toLowerCase();
          item.style.display = groupName.includes(search) ? "flex" : "none";
        });
      }

      function showError(message) {
        const errorDiv = document.getElementById("errorMessage");
        errorDiv.textContent = message;
        errorDiv.style.display = "block";
        setTimeout(() => {
          errorDiv.style.display = "none";
        }, 5000);
      }

      // Modal functions
      function showNewGroupModal() {
        document.getElementById("newGroupModal").classList.add("active");
      }

      function closeNewGroupModal() {
        document.getElementById("newGroupModal").classList.remove("active");
        document.getElementById("groupName").value = "";
      }

      async function createNewGroup(event) {
        event.preventDefault();

        try {
          const groupName = document.getElementById("groupName").value;

          const token = localStorage.getItem("token");
          const apiUrl = await getApiUrl();

          const newGroupDetails = { groupName };

          const response = await axios.post(
            `${apiUrl}/group/new-group/${currentUserId}`,
            newGroupDetails,
            {
              headers: { Authorization: token },
            }
          );

          const newGroup = response.data.newGroupDetails;

          // Update localStorage
          localStorage.setItem("groupid", newGroup.id);
          localStorage.setItem("groupName", newGroup.groupName);
          localStorage.setItem(
            "link",
            `${apiUrl}/signup.html?groupId=${newGroup.id}`
          );

          // Close modal
          closeNewGroupModal();

          // Reload groups and select new group
          await loadUserGroups();
          selectGroupById(newGroup.id);

          alert("Group created successfully!");
          window.location.reload();
        } catch (error) {
          console.error("Error creating group:", error);
          showError("Failed to create group");
        }
      }

      // Panel functions
      function toggleDetailsPanel() {
        const panel = document.getElementById("detailsPanel");
        const overlay = document.getElementById("overlay");

        if (panel.classList.contains("open")) {
          closeDetailsPanel();
        } else {
          panel.classList.add("open");
          overlay.classList.add("active");
          // Load fresh group details
          loadGroupDetails();
        }
      }

      function closeDetailsPanel() {
        const panel = document.getElementById("detailsPanel");
        const overlay = document.getElementById("overlay");

        panel.classList.remove("open");
        overlay.classList.remove("active");
      }

      function signOut() {
        if (confirm("Are you sure you want to sign out?")) {
          // localStorage.clear();
          window.location.href = "login.html";
        }
      }

      // Initialize app on page load
      document.addEventListener("DOMContentLoaded", initializeApp);

      // Handle keypress events
      document.addEventListener("keydown", function (event) {
        // Close modals with Escape key
        if (event.key === "Escape") {
          closeNewGroupModal();
          closeDetailsPanel();
        }
      });
      // Cleanup function to call when leaving the page
      window.addEventListener("beforeunload", () => {
        
        if (socket && currentGroupId) {
          socket.emit("leaveRoom", currentGroupId);
          socket.disconnect();
        }
      });