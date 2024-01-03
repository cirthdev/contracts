// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "@openzeppelin/contracts/utils/Strings.sol";
import "./Base64.sol";

library TokenURI {
		/**
		  <svg viewBox="0 0 350 350" xmlns="http://www.w3.org/2000/svg">
				<rect width="100%" height="100%" fill="#101010" />
				<style>.base { fill: white; font-family: monospace; font-size: 18px; }</style>
				<text>...</text>
				<text>...</text>
				<text>...</text>
				<text>...</text>
				<text>...</text>
				<text>...</text>
				<text>...</text>
				<text>...</text>
				<text>...</text>
				<path fill="#FB8C00" d="M313.844 292.477c-5.5 0-10 4.5-10 10v4h4v-4c0-3.3 2.7-6 6-6s6 2.7 6 6v4h4v-4C323.844 296.977 319.344 292.477 313.844 292.477zM325.844 332.477H301.844c-2.2 0-4-1.8-4-4V310.477c0-2.2 1.8-4 4-4h24c2.2 0 4 1.8 4 4v18C329.844 330.677 328.044 332.477 325.844 332.477z"/>
			</svg>
		 */
		string constant lockPath = '<path fill="#FB8C00" d="M313.844 292.477c-5.5 0-10 4.5-10 10v4h4v-4c0-3.3 2.7-6 6-6s6 2.7 6 6v4h4v-4C323.844 296.977 319.344 292.477 313.844 292.477zM325.844 332.477H301.844c-2.2 0-4-1.8-4-4V310.477c0-2.2 1.8-4 4-4h24c2.2 0 4 1.8 4 4v18C329.844 330.677 328.044 332.477 325.844 332.477z"/><circle fill="#C76E00" cx="314" cy="319" r="5"/>';

    function uri(
			string memory tick,
			uint256 tokenId,
			uint256 max,
			uint256 limit,
			bool    depositing
		) public pure returns (string memory) {
        string[17] memory parts;
				string[7] memory parts2;
        parts[0] = '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>.base { fill: white; font-family: monospace; font-size: 18px; }</style><rect width="100%" height="100%" fill="#101010" /><text x="40" y="60" class="base">';
        parts[1] = "{";
        parts[2] = '</text><text x="60" y="80" class="base">';
        parts[3] = '"p":"ferc-721",';
				parts2[0] = '\\"p\\":\\"ferc-721\\",';
        parts[4] = '</text><text x="60" y="110" class="base">';
        parts[5] = '"op":"mint",';
				parts2[1] = '\\"op\\":\\"mint\\",';
        parts[6] = '</text><text x="60" y="140" class="base">';
        parts[7] = string(abi.encodePacked('"tick":"', tick, '",'));
				parts2[2] = string(abi.encodePacked('\\"tick\\":\\"', tick, '\\",'));
        parts[8] = '</text><text x="60" y="170" class="base">';
        parts[9] = string(abi.encodePacked('"max":', Strings.toString(max), ','));
				parts2[3] = string(abi.encodePacked('\\"max\\":', Strings.toString(max), ','));
        parts[10] = '</text><text x="60" y="200" class="base">';
        parts[11] = string(abi.encodePacked('"lim":', Strings.toString(limit), ','));//'"lim":1,';
				parts2[4] = string(abi.encodePacked('\\"lim\\":', Strings.toString(limit), ',')); //'\\"lim\\":1,';
        parts[12] = '</text><text x="60" y="230" class="base">';
        parts[13] = string(abi.encodePacked('"id":', Strings.toString(tokenId)));
				parts2[5] = string(abi.encodePacked('\\"id\\":', Strings.toString(tokenId)));
        parts[14] = '</text><text x="40" y="280" class="base">';
        parts[15] = '}';
        parts[16] = depositing ? string(abi.encodePacked('</text>', lockPath, '</svg>')) : '</text></svg>';

				string memory description = string(abi.encodePacked(parts[1], parts2[0], parts2[1], parts2[2], parts2[3], parts2[4], parts2[5], parts[15]));
				description = string(abi.encodePacked(description, "\\n\\nferc-721 is protocol for Cirth, visit https://docs.cirth.meme for more information"));
        string memory output = string(abi.encodePacked(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], parts[6], parts[7], parts[8]));
        output = string(abi.encodePacked(output, parts[9], parts[10], parts[11], parts[12], parts[13], parts[14], parts[15], parts[16]));
        string memory json = Base64.encode(bytes(string(abi.encodePacked('{"name": "#', Strings.toString(tokenId), '", "description": "', description, '", "image": "data:image/svg+xml;base64,', Base64.encode(bytes(output)), '"}'))));
        output = string(abi.encodePacked('data:application/json;base64,', json));
        return output;
    }
}